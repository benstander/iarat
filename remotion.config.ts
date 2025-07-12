import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
Config.setPixelFormat('yuv420p');
Config.setCodec('h264');
Config.setCrf(28); // Higher = lower quality, faster render
Config.setJpegQuality(60); // Lower quality for faster processing
Config.setConcurrency(4); // More parallel processing 