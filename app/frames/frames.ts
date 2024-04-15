import { createFrames } from "frames.js/next";

export type State = {
  counter: number;
};
 
export const frames = createFrames({
  basePath: "/frames",
  initialState: {
    counter: 0,
    name: '',
    txId: ''
  },
});