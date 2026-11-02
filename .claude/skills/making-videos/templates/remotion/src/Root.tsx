import { AbsoluteFill, Audio, Composition, getStaticFiles } from "remotion";
import { Demo, Intro } from "./chapters/Example";
import { FPS, TOTAL } from "./cues";
import { Captions } from "./parts/Captions";
import { SceneWindow } from "./parts/SceneWindow";
import { H, useFonts, W } from "./theme";

// One SceneWindow per chapter, in voice.json order, so each incoming window paints over the outgoing one.
const Film = ({ captions }: { captions: boolean }) => {
  useFonts();
  const voiceWav = getStaticFiles().find((f) => f.name === "voice.wav");
  return (
    <AbsoluteFill>
      <SceneWindow id="intro"><Intro /></SceneWindow>
      <SceneWindow id="demo"><Demo /></SceneWindow>
      {captions ? <Captions /> : null}
      {voiceWav ? <Audio src={voiceWav.src} /> : null}
    </AbsoluteFill>
  );
};

export const Root = () => (
  <Composition id="Film" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} defaultProps={{ captions: true }} />
);
