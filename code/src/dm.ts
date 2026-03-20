import { assign, createActor, setup, and, or, fromPromise, type StateNodeConfig } from "xstate";
import type { Settings } from "speechstate";
import { speechstate } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY, NLU_KEY } from "./azure";
import { GUIDE_PROMPT, INTRO, GUIDE_FIRST_UTT, CRAB_FIRST_UTT, CRAB_PROMPT, FISHERMAN_FIRST_UTT, FISHERMAN_PROMPT } from "./prompts";
import type { DMContext, DMEvents } from "./types";
import OpenAI from "openai";

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://francecentral.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const azureLanguageCredentials = {
  endpoint: "https://lab-gusmilczo.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2024-11-15-preview" /** your Azure CLU prediction URL */,
  key: NLU_KEY /** reference to your Azure CLU key */,
  deploymentName: "lagoon" /** your Azure CLU deployment */,
  projectName: "lagoon" /** your Azure CLU project name */,
};

const settings: Settings = {
  azureLanguageCredentials: azureLanguageCredentials,
  azureCredentials: azureCredentials,
  azureRegion: "francecentral",
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  ttsDefaultVoice: "en-US-DavisNeural",
};



const client = new OpenAI({
  apiKey: "EMPTY",
  baseURL: "http://localhost:11434/v1",
  dangerouslyAllowBrowser: true,
});

async function getLLMAnswer(dialogue: OpenAI.Chat.Completions.ChatCompletionMessageParam[], prompt: string): Promise<string> {
  const completion = await client.chat.completions.create({
    model: "llama3.1:8b",
    messages: [{"role":"system", "content": prompt} as OpenAI.Chat.Completions.ChatCompletionMessageParam].concat(dialogue ?? []),
  });

  return completion.choices[0].message.content ?? "";
}


const dmMachine = setup({
  types: {
    context: {} as DMContext,
    events: {} as DMEvents,
  },
  actions: {
    "spst.speak": ({ context }, params: { utterance: string }) =>
      context.spstRef.send({
        type: "SPEAK",
        value: {
          utterance: params.utterance,
        },
      }),
    "spst.listen": ({ context }) =>
      context.spstRef.send({
        type: "LISTEN",
        value: { nlu: true}, // activating NLU
      }),
    "resetVars" : assign(() => ({
            lastResult: null,
            interpretation: null,
      })),
  },
  guards:{
    isYes: ({context}) => context.interpretation?.entities?.find(e => e.resolutions?.[0].resolutionKind === "BooleanResolution")?.resolutions?.[0].value ?? false,
    isNo: ({context}) => !(context.interpretation?.entities?.find(e => e.resolutions?.[0].resolutionKind === "BooleanResolution")?.resolutions?.[0].value ?? true),
    isEndConversation: ({context}) => context.interpretation?.topIntent === "EndConversation",
    isCharacter: ({context}, params: { name: string }) => {
      return (context.interpretation?.topIntent === "ChooseCharacter") && (context.interpretation?.entities?.find(e=>e.extraInformation?.[0].extraInformationKind === "ListKey")?.extraInformation?.[0].key === params.name);
    },
  },
  actors: {
    getLLMAnswerActor: fromPromise(
      async ({ input }: { input: { dialogue: any; prompt: string } }) => {
        return getLLMAnswer(input.dialogue, input.prompt);
      }
    )
  },
}).createMachine({
  context: ({ spawn }) => ({
    spstRef: spawn(speechstate, { input: settings }),
    lastResult: null,
    interpretation: null,
    guideHistory: [{"role":  "assistant", "content": GUIDE_FIRST_UTT}],
    crabHistory: [{"role": "assistant", "content": CRAB_FIRST_UTT}],
    fishermanHistory: [{"role" : "assistant", "content": FISHERMAN_FIRST_UTT}],
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: ({ context }) => context.spstRef.send({ type: "PREPARE" }),
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: { CLICK: "Game" },
      
    },
    NoInput: {
      entry: {
        type: "spst.speak",
        params: { utterance: `I can't hear you!` },
      },
      on: { SPEAK_COMPLETE: {target: "Game.hist"} },
    },
    Game:{
      id: "Game",
      initial: "Intro",
      states: {
        hist: {
          type: "history",
          history: "deep",
        },
        // The Lagoon speaking
        Intro: {
          entry: [
            ({}) => setDivVisibility("mapOnly", false),
            { type: "spst.speak", params: { utterance: INTRO } }],
          on: {
            SPEAK_COMPLETE: {
              target: "Guide",
              actions: ({}) => setDivVisibility("mapOnly", true),
            }
          }, 
        },
        Guide: {
          initial: "FirstUtterance",
          on: {
            LISTEN_COMPLETE: [
              {
                target: "Crab",
                actions: ({}) => {
                  setDivVisibility("main", true);
                  setDivVisibility("crab", false);
                },
                guard: {
                  type: "isCharacter",
                  params: () => ({name: "Blue Crab"})
                },
              },
              {
                target: "Fisherman",
                actions: ({}) => {
                  setDivVisibility("main", true);
                  setDivVisibility("fisherman", false);
                },
                guard: {
                  type: "isCharacter",
                  params: () => ({name: "Fisherman"})
                },
              },
              {
                target: "#DM.Done",
                guard: "isEndConversation",
              },
              {
                target: ".Prompt",
                guard: ({ context }) => !!context.lastResult,
              },
              { target: "#DM.NoInput" },
            ],
          },
          states: {
            FirstUtterance: {
              entry:[ 
                ({}) => setDivVisibility("main", false),
                {type: "spst.speak", params: ({context}) => ({utterance: context.guideHistory?.at(-1)?.content as string ?? GUIDE_FIRST_UTT })}],
              on: {SPEAK_COMPLETE: "Ask"}
            },
            Prompt: {
                invoke: {
                  src: "getLLMAnswerActor",
                  input: ({ context }) => ({
                    dialogue: context.guideHistory,
                    prompt: GUIDE_PROMPT
                  }),
                  onDone: {
                    actions: [
                      {
                        type: "spst.speak",
                        params: ({ event }) => ({
                          utterance: event.output
                        })
                      },
                      assign(({ context, event }) => {
                        return {guideHistory: (context.guideHistory ?? []).concat([{"role": "assistant", "content": event.output}])};
                      }),
                    ],
                    target: "SpeakPrompt"
                  }
              }
            },
            SpeakPrompt: {
              entry: {
                type: "spst.speak",
                params: ({context}) => ({utterance: context.guideHistory?.at(-1)?.content as string ?? "Sorry, there was an error"}),
              },
              on: {
                SPEAK_COMPLETE: "Ask"
              }
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: {
                  actions: assign(({ context, event }) => {
                    return { lastResult: event.value, interpretation: event.nluValue, guideHistory: (context.guideHistory ?? []).concat([{"role": "user", "content": event.value?.[0].utterance}]) };
                  }),
                },
                ASR_NOINPUT: {
                  actions: assign({ lastResult: null }),
                  invoke: "#DM.NoInput"
                },
              },
            },
          },
        },
        Crab: {
          initial: "FirstUtterance",
          on: {
            LISTEN_COMPLETE: [
              {
                target: "Guide",
                actions: assign(({ context }) => {
                        return {crabHistory: (context.crabHistory ?? []).concat([{"role": "assistant", "content": "So how did talking to the Crab go?"}])};
                      }),
                guard: "isEndConversation",
              },
              {
                target: ".Prompt",
                guard: ({ context }) => !!context.lastResult,
              },
              { target: "#DM.NoInput" },
            ],
          },
          states: {
            FirstUtterance: {
              entry: {type: "spst.speak", params: {utterance: CRAB_FIRST_UTT}},
              on: {SPEAK_COMPLETE: "Ask"}
            },
            Prompt: {
                invoke: {
                  src: "getLLMAnswerActor",
                  input: ({ context }) => ({
                    dialogue: context.crabHistory,
                    prompt: CRAB_PROMPT,
                  }),
                  onDone: {
                    actions: [
                      {
                        type: "spst.speak",
                        params: ({ event }) => ({
                          utterance: event.output
                        })
                      },
                      assign(({ context, event }) => {
                        return {crabHistory: (context.crabHistory ?? []).concat([{"role": "assistant", "content": event.output}])};
                      }),
                    ],
                    target: "SpeakPrompt"
                  }
              }
            },
            SpeakPrompt: {
              entry: {
                type: "spst.speak",
                params: ({context}) => ({utterance: context.crabHistory?.at(-1)?.content as string ?? "Sorry, there was an error"}),
              },
              on: {
                SPEAK_COMPLETE: "Ask"
              }
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: {
                  actions: assign(({ context, event }) => {
                    return { lastResult: event.value, interpretation: event.nluValue, crabHistory: (context.crabHistory ?? []).concat([{"role": "user", "content": event.value?.[0].utterance}]) };
                  }),
                },
                ASR_NOINPUT: {
                  actions: assign({ lastResult: null }),
                  invoke: "#DM.NoInput"
                },
              },
            },
          },
        },
        Fisherman: {
          initial: "FirstUtterance",
          on: {
            LISTEN_COMPLETE: [
              {
                target: "Guide",
                actions: assign(({ context }) => {
                        return {fishermanHistory: (context.fishermanHistory ?? []).concat([{"role": "assistant", "content": "So how did talking to the Fisherman go?"}])};
                      }),
                guard: "isEndConversation",
              },
              {
                target: ".Prompt",
                guard: ({ context }) => !!context.lastResult,
              },
              { target: "#DM.NoInput" },
            ],
          },
          states: {
            FirstUtterance: {
              entry: {type: "spst.speak", params: {utterance: FISHERMAN_FIRST_UTT}},
              on: {SPEAK_COMPLETE: "Ask"}
            },
            Prompt: {
                invoke: {
                  src: "getLLMAnswerActor",
                  input: ({ context }) => ({
                    dialogue: context.fishermanHistory,
                    prompt: FISHERMAN_PROMPT,
                  }),
                  onDone: {
                    actions: [
                      {
                        type: "spst.speak",
                        params: ({ event }) => ({
                          utterance: event.output
                        })
                      },
                      assign(({ context, event }) => {
                        return {fishermanHistory: (context.fishermanHistory ?? []).concat([{"role": "assistant", "content": event.output}])};
                      }),
                    ],
                    target: "SpeakPrompt"
                  }
              }
            },
            SpeakPrompt: {
              entry: {
                type: "spst.speak",
                params: ({context}) => ({utterance: context.fishermanHistory?.at(-1)?.content as string ?? "Sorry, there was an error"}),
              },
              on: {
                SPEAK_COMPLETE: "Ask"
              }
            },
            Ask: {
              entry: { type: "spst.listen" },
              on: {
                RECOGNISED: {
                  actions: assign(({ context, event }) => {
                    return { lastResult: event.value, interpretation: event.nluValue, fishermanHistory: (context.fishermanHistory ?? []).concat([{"role": "user", "content": event.value?.[0].utterance}]) };
                  }),
                },
                ASR_NOINPUT: {
                  actions: assign({ lastResult: null }),
                  invoke: "#DM.NoInput"
                },
              },
            },
          },
        },
      },
    },
    Done: {
      entry: [{type: "spst.speak", params: {utterance: "Goodbye!"}}],
      on: {
        CLICK: "Game",
      },
    },
  },
});

const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  console.group("State update");
  console.log("State value:", state.value);
  console.log("State context:", state.context);
  console.groupEnd();
});

export function setupStartButton(element: HTMLButtonElement) {
  element.addEventListener("click", () => {
    setDivVisibility("startPage", true)
    dmActor.send({ type: "CLICK" });
  });

  // When clicked -> make current div 'hidden' and remove hidden from target div
  // dmActor.subscribe((snapshot) => {
  //   const meta: { view?: string } = Object.values(
  //     snapshot.context.spstRef.getSnapshot().getMeta(),
  //   )[0] || {
  //     view: undefined,
  //   };
  //   element.innerHTML = `${meta.view}`;
  // });
}


function setDivVisibility(divId: string, hidden: boolean) {
  const element = document.getElementById(divId);
  if (!element) return;

  element.hidden = hidden;
}
