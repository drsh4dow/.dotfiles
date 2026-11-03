import { Config } from "@remotion/cli/config";

Config.setConcurrency(2);
// The final audio is mixed outside Remotion, so renders carry picture only.
Config.setMuted(true);
Config.setOverwriteOutput(true);
Config.setVideoImageFormat("jpeg");
