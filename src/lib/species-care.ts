export type SpeciesCareField =
  | 'light'
  | 'idealTemperature'
  | 'watering'
  | 'hardiness'
  | 'growthSpeed'
  | 'humidity';

export type SpeciesCareFieldConfig = {
  field: SpeciesCareField;
  label: string;
  iconSrc: string;
  fallback: string;
  options: string[];
};

export const SPECIES_CARE_FIELDS: SpeciesCareFieldConfig[] = [
  {
    field: 'light',
    label: '光照',
    iconSrc: '/icons/02_light_sun.svg',
    fallback: '充足阳光',
    options: ['全日照', '充足阳光', '散射光', '半日照', '明亮通风'],
  },
  {
    field: 'idealTemperature',
    label: '温度',
    iconSrc: '/icons/03_temperature.svg',
    fallback: '15-28°C',
    options: ['10-25°C', '15-28°C', '18-30°C', '20-35°C'],
  },
  {
    field: 'watering',
    label: '浇水',
    iconSrc: '/icons/04_watering_drop.svg',
    fallback: '干透浇透',
    options: ['严格控水', '干透浇透', '见干见湿', '保持微潮'],
  },
  {
    field: 'hardiness',
    label: '耐寒',
    iconSrc: '/icons/05_cold_snowflake.svg',
    fallback: '5°C',
    options: ['-5°C', '10°C以上', '5°C以上', '0°C以上', '-5°C以上'],
  },
  {
    field: 'growthSpeed',
    label: '生长速度',
    iconSrc: '/icons/06_growth_speed.svg',
    fallback: '中等',
    options: ['较慢', '中等', '较快'],
  },
  {
    field: 'humidity',
    label: '湿度',
    iconSrc: '/icons/07_humidity_percent.svg',
    fallback: '20%-60%',
    options: ['20%-40%', '20%-60%', '40%-60%', '60%以上'],
  },
];

export const SPECIES_CARE_FIELD_SET = new Set(SPECIES_CARE_FIELDS.map((item) => item.field));

export function optionsWithDefault(options: string[], defaultValue: string) {
  const value = defaultValue.trim();
  return value && !options.includes(value) ? [value, ...options] : options;
}
