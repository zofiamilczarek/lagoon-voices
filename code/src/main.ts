import "./style.css";
import { setupStartButton } from "./dm.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voices from the Lagoon</title>
</head>
<body>
  <!-- Starting Page -->
  <div data-layer="Starting Page" class="screen light-bg">
    <div data-layer="Voices from the Lagoon" class="title">Voices from the Lagoon</div>
    <div class="button-container">
      <div id="start" data-layer="Button Play" class="button">
        <div class="button-text">PLAY</div>
      </div>
    </div>
    <div data-layer="Created by Joy Ciliani and Zofia Milczarek" class="credits-text bottom">Created by Joy Ciliani and Zofia Milczarek</div>
  </div>

  <!-- Main Map -->
  <div hidden data-layer="Map with the guide and the crab and the fishermen" class="screen light-bg">
    <img data-layer="Map" class="full-width" src="images/map.png" alt="Map" />
    <div data-layer="Guide" class="element" style="width: 428px; height: 903px; left: 48px; top: 188px;">
      <img data-layer="Guide speaking" style="width: 413px; height: 903px; left: 3px; top: 0px; position: absolute;" src="images/guide.png" alt="Guide" />
    </div>
    <img data-layer="Crab" class="element" style="width: 133px; height: 115px; left: 409px; top: 537px;" src="images/crab.png" alt="Crab" />
    <img data-layer="Fishermen" class="element" style="width: 250px; height: 181px; left: 1045px; top: 595px;" src="images/fishermen.png" alt="Fishermen" />
    <img data-layer="Open Door" class="element" style="width: 67px; height: 67px; left: 1355px; top: 25px;" src="images/open-door.png" alt="Exit" />
  </div>

  <!-- Conversation with the guide -->
  <div data-layer="Conversation with the guide" class="screen light-bg">
    <img data-layer="Venice" style="width: 2643px; height: 1475px; left: -641px; top: -145px; position: absolute;" src="images/venice.png" alt="Venice" />
    <div data-layer="Guide" class="element" style="width: 428px; height: 903px; left: 506px; top: 388px;">
      <img data-layer="Guide speaking" style="width: 413px; height: 903px; left: 3px; top: 0px; position: absolute;" src="images/guide.png" alt="Guide" />
    </div>
    <img data-layer="Open Door" class="element" style="width: 67px; height: 67px; left: 1355px; top: 25px;" src="images/open-door.png" alt="Exit" />
  </div>

  <!-- Credits -->
  <div hidden data-layer="Credits" class="screen dark-bg">
    <div class="title" style="color: var(--Color);">Credits</div>
    <div class="credits-text">Created by Joy Ciliani and Zofia Milczarek<br/>For the Dialogue Systems 2026 course of the University of Gothenburg</div>
  </div>

  <!-- The End -->
  <div hidden data-layer="The End" class="screen dark-bg">
    <div class="title" style="color: var(--Color);">THE END<br/>Thank you for playing!</div>
  </div>
</body>
`;

setupStartButton(document.querySelector<HTMLButtonElement>("#start")!);
