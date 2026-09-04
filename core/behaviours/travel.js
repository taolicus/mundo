export const travel = {
  id: "travel",

  perform(dweller, { route, reason }) {
    dweller.startTravel(route, reason);
  },
};
