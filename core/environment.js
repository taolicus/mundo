import { settings } from "./settings.js";

export function seasonAt(t) {
  const year = settings.ticksPerYear;
  const phase = (((t % year) + year) % year) / year;
  if (phase < 0.25) return "spring";
  if (phase < 0.5) return "summer";
  if (phase < 0.75) return "autumn";
  return "winter";
}

export function annualOffset(t) {
  const day = t / settings.hoursPerDay;
  return (
    Math.sin(
      (2 * Math.PI * (day - settings.daysPerYear / 8)) /
        settings.daysPerYear
    ) * settings.annualAmplitude
  );
}

export function heatBias(t) {
  return annualOffset(t) / settings.annualAmplitude;
}

export function seasonExtremity(t) {
  return Math.abs(heatBias(t));
}

export function routeMeanTemperature(route) {
  const a = route?.origin?.climate?.temperature;
  const b = route?.destination?.climate?.temperature;
  if (a == null || b == null) return settings.travelComfortTemp;
  return (a + b) / 2;
}

export function travelTimeMultiplier(temp) {
  const extreme = Math.max(
    0,
    Math.abs(temp - settings.travelComfortTemp) - settings.travelComfortBand
  );
  return 1 + Math.min(settings.travelMaxSlowdown, extreme * settings.travelSlowness);
}

export function isHostileTrek(route) {
  return (
    Math.abs(routeMeanTemperature(route) - settings.travelComfortTemp) >
    settings.unsafeDeviation
  );
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
    const equatorY = this.region.equatorY ?? settings.equatorY;
    const yCooling = this.region.yCooling ?? settings.yCooling;
    const distEquator = Math.abs(equatorY - this.region.y);
    const base = settings.tempBaseMax - distEquator * yCooling;

    const annual = annualOffset(t);

    const daily =
      Math.sin((2 * Math.PI * (t - 6)) / settings.hoursPerDay) *
      settings.dailyAmplitude;

    return base + annual + daily;
  }
}