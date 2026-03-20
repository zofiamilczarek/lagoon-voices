# Voices from the lagoon: A multi species cue game

This repo contains the code for 'Voices from the lagoon' - an interactive game taking the user on a journey of discovering the environmental challenges of the Venetian Lagoon.


## Running the game


1. Install all the dependencies

Make sure you are in the `code` directory.

```sh
npm install
```


2. Install ollama

The LLM in our game is Llama-3.1-8B-Instruct locally hosted with ollama.

Make sure to install ollama for your system (https://ollama.com/download). Once installed you can start the server with:

```
ollama serve llama3.1:8b
```

This will open a chat window in your terminal. Simply close it by typing in `/bye` or with Ctrl+D.


3. Azure integration
- Keys

    Create a file `azure.ts` in `code/src/`.

    It should look like this:

    ```js
    export const KEY = "yourkeyforASRTTS";
    export const NLU_KEY = "yourkeyforNLU";
    ```

- Conversational Language Understanding

    To be able to run the game, you will have to create a CLU service on Azure and deploy it. The specification is in file `clu_azure_specs.json`.

4. Running the game

Type `npm run` in your console and enjoy! If you want to continue the development of the game, run `npm run dev`


