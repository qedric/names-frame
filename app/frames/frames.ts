import { createFrames } from "frames.js/next";

export type State = {
  counter: number;
};
 
export const frames = createFrames({
  basePath: "/frames",
  initialState: {
    counter: 1,
    name: ''
  },
});