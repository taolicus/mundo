import { events } from "../../core/events.js";

export const tend = {
  id: "tend",

  perform(dweller, ctx, t) {
    if (!dweller.place) return;
    const resource = ctx.resource;
    if (!resource) return;
    dweller.place.produceResource(resource, ctx.amount);
    dweller.activity = `tending ${resource.name}`;
    events.emit("tend", {
      t,
      dweller: dweller.name,
      place: dweller.place.name,
      resource: resource.name,
      amount: ctx.amount,
    });
  },
};