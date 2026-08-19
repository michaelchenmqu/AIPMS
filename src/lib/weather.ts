// Weather forecast for the Guest App's Explore tab, via Open-Meteo — free,
// keyless, real forecast data (no API key to manage, unlike the AI helpers
// in lib/ai.ts). Returns null on any failure so the caller can simply omit
// the weather card rather than show something misleading.

const WEATHER_CODE_LABELS: Record<number, { icon: string; label: string }> = {
  0: { icon: "☀️", label: "Clear" },
  1: { icon: "🌤️", label: "Mostly clear" },
  2: { icon: "⛅", label: "Partly cloudy" },
  3: { icon: "☁️", label: "Overcast" },
  45: { icon: "🌫️", label: "Fog" },
  48: { icon: "🌫️", label: "Fog" },
  51: { icon: "🌦️", label: "Light drizzle" },
  53: { icon: "🌦️", label: "Drizzle" },
  55: { icon: "🌦️", label: "Heavy drizzle" },
  61: { icon: "🌧️", label: "Light rain" },
  63: { icon: "🌧️", label: "Rain" },
  65: { icon: "🌧️", label: "Heavy rain" },
  71: { icon: "❄️", label: "Light snow" },
  73: { icon: "❄️", label: "Snow" },
  75: { icon: "❄️", label: "Heavy snow" },
  80: { icon: "🌦️", label: "Rain showers" },
  81: { icon: "🌧️", label: "Rain showers" },
  82: { icon: "⛈️", label: "Violent showers" },
  95: { icon: "⛈️", label: "Thunderstorm" },
  96: { icon: "⛈️", label: "Thunderstorm" },
  99: { icon: "⛈️", label: "Severe thunderstorm" },
};

function describeWeatherCode(code: number): { icon: string; label: string } {
  return WEATHER_CODE_LABELS[code] ?? { icon: "🌡️", label: "Mixed conditions" };
}

export type DailyForecast = {
  date: string; // ISO date, e.g. "2026-08-20"
  icon: string;
  label: string;
  highC: number;
  lowC: number;
};

export async function getWeatherForecast(
  latitude: number,
  longitude: number
): Promise<DailyForecast[] | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=5`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const data = await res.json();
    const days: string[] = data?.daily?.time ?? [];
    const codes: number[] = data?.daily?.weathercode ?? [];
    const highs: number[] = data?.daily?.temperature_2m_max ?? [];
    const lows: number[] = data?.daily?.temperature_2m_min ?? [];
    if (!days.length) return null;

    return days.map((date, i) => {
      const { icon, label } = describeWeatherCode(codes[i]);
      return { date, icon, label, highC: Math.round(highs[i]), lowC: Math.round(lows[i]) };
    });
  } catch {
    return null;
  }
}
