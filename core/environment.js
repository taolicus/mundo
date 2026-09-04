import { settings } from "./settings.js";

export class Climate {
  constructor(region) {
    this.region = region;
    this.temperature = 0;
  }

  update(t) {
    this.temperature = this.calculateTemperature(t);
  }

  calculateTemperature(t) {
    const day = t / settings.hoursPerDay;

    const distEquator = Math.abs(settings.equatorY - this.region.y);
    const base = settings.tempBaseMax - distEquator * settings.yCooling;

    const annual =
      Math.sin((2 * Math.PI * day) / settings.daysPerYear) *
      settings.annualAmplitude;

    const daily =
      Math.sin((2 * Math.PI * (t - 6)) / settings.hoursPerDay) *
      settings.dailyAmplitude;

    return base + annual + daily;
  }
}