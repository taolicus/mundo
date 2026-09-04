import { settings } from "./settings.js";

export function seasonAt(t) {
  const year = settings.ticksPerYear;
  const phase = (((t % year) + year) % year) / year;
  if (phase < 0.25) return "spring";
  if (phase < 0.5) return "summer";
  if (phase < 0.75) return "autumn";
  return "winter";
}

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

    const equatorY = this.region.equatorY ?? settings.equatorY;
    const yCooling = this.region.yCooling ?? settings.yCooling;
    const distEquator = Math.abs(equatorY - this.region.y);
    const base = settings.tempBaseMax - distEquator * yCooling;

    const annual =
      Math.sin(
        (2 * Math.PI * (day - settings.daysPerYear / 8)) /
          settings.daysPerYear
      ) * settings.annualAmplitude;

    const daily =
      Math.sin((2 * Math.PI * (t - 6)) / settings.hoursPerDay) *
      settings.dailyAmplitude;

    return base + annual + daily;
  }
}