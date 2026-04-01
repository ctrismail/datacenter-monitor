// SNMP Simülatör - Gerçek cihaz olmadan test verisi üretir
// Canlıya geçerken bu dosya devre dışı bırakılır, sadece snmp-poller.ts kullanılır

interface SimulatedDevice {
  equipmentId: number;
  type: 'ups' | 'generator' | 'ac' | 'pdu' | 'fire';
  state: Record<string, number>;
}

const devices: Map<number, SimulatedDevice> = new Map();

// Gerçekçi dalgalanma üret
function fluctuate(base: number, range: number, trend: number = 0): number {
  const noise = (Math.random() - 0.5) * range;
  return Math.round((base + noise + trend) * 10) / 10;
}

export function initSimulatedDevice(equipmentId: number, categoryName: string) {
  let type: SimulatedDevice['type'] = 'ups';
  let state: Record<string, number> = {};

  const cat = categoryName.toLowerCase();
  if (cat.includes('ups')) {
    type = 'ups';
    state = {
      input_voltage: 220, output_voltage: 220, battery_percent: 100,
      battery_temp: 25, load_percent: 45, frequency: 50,
      runtime_remaining: 120, output_current: 12
    };
  } else if (cat.includes('jeneratör') || cat.includes('generator')) {
    type = 'generator';
    state = {
      fuel_level: 85, engine_temp: 75, oil_pressure: 4.2,
      battery_voltage: 24.5, rpm: 0, running_hours: 1250,
      coolant_temp: 38, output_voltage: 0
    };
  } else if (cat.includes('klima') || cat.includes('ac') || cat.includes('crac')) {
    type = 'ac';
    state = {
      room_temp: 22, set_temp: 21, humidity: 45,
      supply_temp: 14, return_temp: 28, compressor_status: 1,
      fan_speed: 75, power_consumption: 8.5
    };
  } else if (cat.includes('yangın') || cat.includes('fire')) {
    type = 'fire';
    state = {
      zone1_status: 0, zone2_status: 0, zone3_status: 0,
      panel_status: 1, battery_ok: 1, last_test_days: 5,
      smoke_level: 0, gas_level: 0
    };
  } else if (cat.includes('pano') || cat.includes('elektrik')) {
    type = 'pdu';
    state = {
      total_power: 45.5, voltage_l1: 230, voltage_l2: 228, voltage_l3: 231,
      current_l1: 65, current_l2: 62, current_l3: 68,
      power_factor: 0.98, frequency: 50
    };
  }

  devices.set(equipmentId, { equipmentId, type, state });
}

export function pollSimulatedDevice(equipmentId: number): Record<string, { value: number; status: 'normal' | 'warning' | 'critical' }> | null {
  const device = devices.get(equipmentId);
  if (!device) return null;

  const result: Record<string, { value: number; status: 'normal' | 'warning' | 'critical' }> = {};

  switch (device.type) {
    case 'ups': {
      device.state.input_voltage = fluctuate(220, 8);
      device.state.output_voltage = fluctuate(220, 2);
      device.state.battery_percent = Math.max(85, Math.min(100, fluctuate(device.state.battery_percent, 1)));
      device.state.battery_temp = fluctuate(25, 3);
      device.state.load_percent = fluctuate(45, 10);
      device.state.frequency = fluctuate(50, 0.3);
      device.state.runtime_remaining = fluctuate(120, 10);
      device.state.output_current = fluctuate(12, 3);

      for (const [key, val] of Object.entries(device.state)) {
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (key === 'battery_percent' && val < 50) status = 'critical';
        else if (key === 'battery_percent' && val < 80) status = 'warning';
        else if (key === 'battery_temp' && val > 40) status = 'critical';
        else if (key === 'battery_temp' && val > 35) status = 'warning';
        else if (key === 'load_percent' && val > 80) status = 'critical';
        else if (key === 'load_percent' && val > 65) status = 'warning';
        else if (key === 'input_voltage' && (val < 200 || val > 240)) status = 'warning';
        result[key] = { value: val, status };
      }
      break;
    }
    case 'generator': {
      device.state.fuel_level = Math.max(20, Math.min(100, fluctuate(device.state.fuel_level, 0.5, -0.02)));
      device.state.engine_temp = fluctuate(75, 5);
      device.state.oil_pressure = fluctuate(4.2, 0.5);
      device.state.battery_voltage = fluctuate(24.5, 0.5);
      device.state.coolant_temp = fluctuate(38, 3);
      device.state.running_hours = device.state.running_hours + 0.01;

      for (const [key, val] of Object.entries(device.state)) {
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (key === 'fuel_level' && val < 20) status = 'critical';
        else if (key === 'fuel_level' && val < 40) status = 'warning';
        else if (key === 'engine_temp' && val > 95) status = 'critical';
        else if (key === 'engine_temp' && val > 85) status = 'warning';
        else if (key === 'oil_pressure' && (val < 2 || val > 6)) status = 'critical';
        else if (key === 'battery_voltage' && val < 22) status = 'critical';
        result[key] = { value: Math.round(val * 10) / 10, status };
      }
      break;
    }
    case 'ac': {
      device.state.room_temp = fluctuate(22, 1.5);
      device.state.humidity = fluctuate(45, 5);
      device.state.supply_temp = fluctuate(14, 2);
      device.state.return_temp = fluctuate(28, 2);
      device.state.fan_speed = fluctuate(75, 10);
      device.state.power_consumption = fluctuate(8.5, 2);

      for (const [key, val] of Object.entries(device.state)) {
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (key === 'room_temp' && val > 28) status = 'critical';
        else if (key === 'room_temp' && val > 25) status = 'warning';
        else if (key === 'humidity' && (val > 65 || val < 30)) status = 'warning';
        else if (key === 'humidity' && (val > 75 || val < 20)) status = 'critical';
        result[key] = { value: Math.round(val * 10) / 10, status };
      }
      break;
    }
    case 'fire': {
      device.state.smoke_level = fluctuate(0, 0.5);
      device.state.gas_level = fluctuate(0, 0.3);
      device.state.last_test_days = device.state.last_test_days + 0.001;

      for (const [key, val] of Object.entries(device.state)) {
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (key === 'smoke_level' && val > 2) status = 'critical';
        else if (key === 'smoke_level' && val > 0.5) status = 'warning';
        else if (key === 'last_test_days' && val > 30) status = 'warning';
        result[key] = { value: Math.round(Math.max(0, val) * 10) / 10, status };
      }
      break;
    }
    case 'pdu': {
      device.state.total_power = fluctuate(45.5, 5);
      device.state.voltage_l1 = fluctuate(230, 5);
      device.state.voltage_l2 = fluctuate(228, 5);
      device.state.voltage_l3 = fluctuate(231, 5);
      device.state.current_l1 = fluctuate(65, 8);
      device.state.current_l2 = fluctuate(62, 8);
      device.state.current_l3 = fluctuate(68, 8);
      device.state.power_factor = fluctuate(0.98, 0.03);
      device.state.frequency = fluctuate(50, 0.2);

      for (const [key, val] of Object.entries(device.state)) {
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (key.startsWith('voltage') && (val < 210 || val > 250)) status = 'warning';
        else if (key.startsWith('current') && val > 85) status = 'critical';
        else if (key.startsWith('current') && val > 75) status = 'warning';
        else if (key === 'power_factor' && val < 0.9) status = 'warning';
        result[key] = { value: Math.round(val * 100) / 100, status };
      }
      break;
    }
  }

  return result;
}

// OID label'ları (Türkçe)
export const oidLabels: Record<string, Record<string, { label: string; unit: string; oid: string }>> = {
  ups: {
    input_voltage: { label: 'Giriş Voltajı', unit: 'V', oid: '.1.3.6.1.4.1.318.1.1.1.3.2.1' },
    output_voltage: { label: 'Çıkış Voltajı', unit: 'V', oid: '.1.3.6.1.4.1.318.1.1.1.4.2.1' },
    battery_percent: { label: 'Batarya Seviyesi', unit: '%', oid: '.1.3.6.1.4.1.318.1.1.1.2.2.1' },
    battery_temp: { label: 'Batarya Sıcaklığı', unit: '°C', oid: '.1.3.6.1.4.1.318.1.1.1.2.2.2' },
    load_percent: { label: 'Yük Oranı', unit: '%', oid: '.1.3.6.1.4.1.318.1.1.1.4.2.3' },
    frequency: { label: 'Frekans', unit: 'Hz', oid: '.1.3.6.1.4.1.318.1.1.1.4.2.2' },
    runtime_remaining: { label: 'Kalan Süre', unit: 'dk', oid: '.1.3.6.1.4.1.318.1.1.1.2.2.3' },
    output_current: { label: 'Çıkış Akımı', unit: 'A', oid: '.1.3.6.1.4.1.318.1.1.1.4.2.4' },
  },
  generator: {
    fuel_level: { label: 'Yakıt Seviyesi', unit: '%', oid: '.1.3.6.1.4.1.99999.1.1.1' },
    engine_temp: { label: 'Motor Sıcaklığı', unit: '°C', oid: '.1.3.6.1.4.1.99999.1.1.2' },
    oil_pressure: { label: 'Yağ Basıncı', unit: 'bar', oid: '.1.3.6.1.4.1.99999.1.1.3' },
    battery_voltage: { label: 'Akü Voltajı', unit: 'V', oid: '.1.3.6.1.4.1.99999.1.1.4' },
    rpm: { label: 'Devir (RPM)', unit: 'rpm', oid: '.1.3.6.1.4.1.99999.1.1.5' },
    running_hours: { label: 'Çalışma Saati', unit: 'saat', oid: '.1.3.6.1.4.1.99999.1.1.6' },
    coolant_temp: { label: 'Soğutma Suyu', unit: '°C', oid: '.1.3.6.1.4.1.99999.1.1.7' },
    output_voltage: { label: 'Çıkış Voltajı', unit: 'V', oid: '.1.3.6.1.4.1.99999.1.1.8' },
  },
  ac: {
    room_temp: { label: 'Ortam Sıcaklığı', unit: '°C', oid: '.1.3.6.1.4.1.99998.1.1.1' },
    set_temp: { label: 'Ayar Sıcaklığı', unit: '°C', oid: '.1.3.6.1.4.1.99998.1.1.2' },
    humidity: { label: 'Nem Oranı', unit: '%', oid: '.1.3.6.1.4.1.99998.1.1.3' },
    supply_temp: { label: 'Üfleme Sıcaklığı', unit: '°C', oid: '.1.3.6.1.4.1.99998.1.1.4' },
    return_temp: { label: 'Dönüş Sıcaklığı', unit: '°C', oid: '.1.3.6.1.4.1.99998.1.1.5' },
    compressor_status: { label: 'Kompresör', unit: '', oid: '.1.3.6.1.4.1.99998.1.1.6' },
    fan_speed: { label: 'Fan Hızı', unit: '%', oid: '.1.3.6.1.4.1.99998.1.1.7' },
    power_consumption: { label: 'Güç Tüketimi', unit: 'kW', oid: '.1.3.6.1.4.1.99998.1.1.8' },
  },
  fire: {
    zone1_status: { label: 'Bölge 1', unit: '', oid: '.1.3.6.1.4.1.99997.1.1.1' },
    zone2_status: { label: 'Bölge 2', unit: '', oid: '.1.3.6.1.4.1.99997.1.1.2' },
    zone3_status: { label: 'Bölge 3', unit: '', oid: '.1.3.6.1.4.1.99997.1.1.3' },
    panel_status: { label: 'Panel Durumu', unit: '', oid: '.1.3.6.1.4.1.99997.1.1.4' },
    battery_ok: { label: 'Batarya', unit: '', oid: '.1.3.6.1.4.1.99997.1.1.5' },
    smoke_level: { label: 'Duman Seviyesi', unit: 'ppm', oid: '.1.3.6.1.4.1.99997.1.1.6' },
    gas_level: { label: 'Gaz Seviyesi', unit: 'ppm', oid: '.1.3.6.1.4.1.99997.1.1.7' },
    last_test_days: { label: 'Son Test', unit: 'gün', oid: '.1.3.6.1.4.1.99997.1.1.8' },
  },
  pdu: {
    total_power: { label: 'Toplam Güç', unit: 'kW', oid: '.1.3.6.1.4.1.99996.1.1.1' },
    voltage_l1: { label: 'Voltaj L1', unit: 'V', oid: '.1.3.6.1.4.1.99996.1.1.2' },
    voltage_l2: { label: 'Voltaj L2', unit: 'V', oid: '.1.3.6.1.4.1.99996.1.1.3' },
    voltage_l3: { label: 'Voltaj L3', unit: 'V', oid: '.1.3.6.1.4.1.99996.1.1.4' },
    current_l1: { label: 'Akım L1', unit: 'A', oid: '.1.3.6.1.4.1.99996.1.1.5' },
    current_l2: { label: 'Akım L2', unit: 'A', oid: '.1.3.6.1.4.1.99996.1.1.6' },
    current_l3: { label: 'Akım L3', unit: 'A', oid: '.1.3.6.1.4.1.99996.1.1.7' },
    power_factor: { label: 'Güç Faktörü', unit: '', oid: '.1.3.6.1.4.1.99996.1.1.8' },
    frequency: { label: 'Frekans', unit: 'Hz', oid: '.1.3.6.1.4.1.99996.1.1.9' },
  },
};
