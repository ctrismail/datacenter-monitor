import { pool, query } from '../config/db';

async function seed() {
  console.log('Seeding database with realistic datacenter data...');

  // ============================================================
  // KULLANICILAR
  // ============================================================
  const bcrypt = require('bcryptjs');
  const techHash = await bcrypt.hash('Teknisyen1', 10);

  await query(`
    INSERT INTO users (username, display_name, password_hash) VALUES
      ('ahmet.yilmaz', 'Ahmet Yılmaz', $1),
      ('mehmet.kaya', 'Mehmet Kaya', $1),
      ('elif.demir', 'Elif Demir', $1)
    ON CONFLICT (username) DO NOTHING
  `, [techHash]);
  console.log('Users created');

  // ============================================================
  // EKİPMAN KATEGORİLERİ (mevcut: Jeneratör=1, Klima=2)
  // Ek kategoriler
  // ============================================================
  await query(`
    INSERT INTO equipment_categories (name, icon, sort_order) VALUES
      ('UPS', 'battery', 3),
      ('Yangın Sistemi', 'flame', 4),
      ('Elektrik Panosu', 'zap', 5)
    ON CONFLICT DO NOTHING
  `);

  // UPS, Yangın, Pano field tanımları
  const upsCategory = (await query("SELECT id FROM equipment_categories WHERE name='UPS'")).rows[0]?.id;
  const fireCategory = (await query("SELECT id FROM equipment_categories WHERE name='Yangın Sistemi'")).rows[0]?.id;
  const panelCategory = (await query("SELECT id FROM equipment_categories WHERE name='Elektrik Panosu'")).rows[0]?.id;

  if (upsCategory) {
    await query(`
      INSERT INTO check_field_definitions (category_id, field_name, field_label, field_type, unit, sort_order, is_required) VALUES
        ($1, 'input_voltage', 'Giriş Voltajı', 'number', 'V', 1, true),
        ($1, 'output_voltage', 'Çıkış Voltajı', 'number', 'V', 2, true),
        ($1, 'battery_level', 'Batarya Seviyesi', 'number', '%', 3, true),
        ($1, 'load_percent', 'Yük Oranı', 'number', '%', 4, true),
        ($1, 'battery_temp', 'Batarya Sıcaklığı', 'number', '°C', 5, false),
        ($1, 'ups_mode', 'UPS Modu', 'select', NULL, 6, true),
        ($1, 'alarm_status', 'Alarm Durumu', 'boolean', NULL, 7, true)
      ON CONFLICT DO NOTHING
    `, [upsCategory]);
  }

  if (fireCategory) {
    await query(`
      INSERT INTO check_field_definitions (category_id, field_name, field_label, field_type, unit, sort_order, is_required) VALUES
        ($1, 'panel_status', 'Panel Durumu', 'select', NULL, 1, true),
        ($1, 'detector_test', 'Dedektör Testi', 'boolean', NULL, 2, true),
        ($1, 'gas_pressure', 'Gaz Basıncı', 'number', 'bar', 3, false),
        ($1, 'extinguisher_check', 'Yangın Söndürücü Kontrolü', 'boolean', NULL, 4, true),
        ($1, 'emergency_exit', 'Acil Çıkış Kontrolü', 'boolean', NULL, 5, true)
      ON CONFLICT DO NOTHING
    `, [fireCategory]);
  }

  if (panelCategory) {
    await query(`
      INSERT INTO check_field_definitions (category_id, field_name, field_label, field_type, unit, sort_order, is_required) VALUES
        ($1, 'phase_r_voltage', 'R Faz Voltajı', 'number', 'V', 1, true),
        ($1, 'phase_s_voltage', 'S Faz Voltajı', 'number', 'V', 2, true),
        ($1, 'phase_t_voltage', 'T Faz Voltajı', 'number', 'V', 3, true),
        ($1, 'total_current', 'Toplam Akım', 'number', 'A', 4, true),
        ($1, 'power_factor', 'Güç Faktörü', 'number', '', 5, false),
        ($1, 'panel_temp', 'Pano Sıcaklığı', 'number', '°C', 6, false),
        ($1, 'breaker_status', 'Şalter Durumu', 'boolean', NULL, 7, true)
      ON CONFLICT DO NOTHING
    `, [panelCategory]);
  }

  console.log('Categories and field definitions created');

  // ============================================================
  // EKİPMANLAR - Orta ölçekli veri merkezi standardında
  // ============================================================

  // Jeneratörler (category_id = 1)
  const generators = [
    { name: 'Jeneratör 1 - Ana', location: 'B Blok Bodrum Kat - Jeneratör Odası', description: 'Cummins QSK60-G23, 2000 kVA, Dizel' },
    { name: 'Jeneratör 2 - Yedek', location: 'B Blok Bodrum Kat - Jeneratör Odası', description: 'Cummins QSK60-G23, 2000 kVA, Dizel (Yedek)' },
  ];

  for (const gen of generators) {
    await query(
      'INSERT INTO equipment (category_id, name, location, description) VALUES (1, $1, $2, $3) ON CONFLICT DO NOTHING',
      [gen.name, gen.location, gen.description]
    );
  }

  // Klimalar (category_id = 2) - Precision AC (CRAC/CRAH)
  const acs = [
    { name: 'CRAC-01 Ana Salon', location: 'A Blok 1. Kat - Ana Sunucu Salonu', description: 'Emerson Liebert PEX 100kW, Downflow' },
    { name: 'CRAC-02 Ana Salon', location: 'A Blok 1. Kat - Ana Sunucu Salonu', description: 'Emerson Liebert PEX 100kW, Downflow' },
    { name: 'CRAC-03 Network Odası', location: 'A Blok 1. Kat - Network Odası', description: 'Emerson Liebert PCW 30kW' },
    { name: 'Split Klima - UPS Odası', location: 'B Blok Zemin Kat - UPS Odası', description: 'Mitsubishi Heavy 24000 BTU' },
    { name: 'Split Klima - Elektrik Odası', location: 'B Blok Zemin Kat - Elektrik Odası', description: 'Mitsubishi Heavy 18000 BTU' },
  ];

  for (const ac of acs) {
    await query(
      'INSERT INTO equipment (category_id, name, location, description) VALUES (2, $1, $2, $3) ON CONFLICT DO NOTHING',
      [ac.name, ac.location, ac.description]
    );
  }

  // UPS
  if (upsCategory) {
    const upsList = [
      { name: 'UPS-01 Ana', location: 'B Blok Zemin Kat - UPS Odası', description: 'Eaton 93PM 200kVA, Çift Konvertör' },
      { name: 'UPS-02 Yedek', location: 'B Blok Zemin Kat - UPS Odası', description: 'Eaton 93PM 200kVA, Çift Konvertör (Yedek)' },
      { name: 'UPS-03 Network', location: 'A Blok 1. Kat - Network Odası', description: 'APC Smart-UPS 10kVA' },
    ];
    for (const ups of upsList) {
      await query(
        'INSERT INTO equipment (category_id, name, location, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [upsCategory, ups.name, ups.location, ups.description]
      );
    }
  }

  // Yangın Sistemi
  if (fireCategory) {
    await query(
      'INSERT INTO equipment (category_id, name, location, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [fireCategory, 'FM-200 Söndürme Sistemi', 'A Blok 1. Kat - Ana Sunucu Salonu', 'Novec 1230 / FM-200 Gazlı Söndürme']
    );
    await query(
      'INSERT INTO equipment (category_id, name, location, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
      [fireCategory, 'Yangın Algılama Paneli', 'B Blok Giriş Kat - Güvenlik', 'VESDA Aspirasyonlu Algılama Sistemi']
    );
  }

  // Elektrik Panosu
  if (panelCategory) {
    const panels = [
      { name: 'Ana Dağıtım Panosu (ADP)', location: 'B Blok Zemin Kat - Elektrik Odası', description: 'Ana şebeke giriş panosu, 3x400A' },
      { name: 'UPS Dağıtım Panosu', location: 'B Blok Zemin Kat - UPS Odası', description: 'UPS çıkış dağıtım panosu' },
      { name: 'IT Yük Panosu', location: 'A Blok 1. Kat - Ana Sunucu Salonu', description: 'Rack PDU beslemeleri' },
    ];
    for (const p of panels) {
      await query(
        'INSERT INTO equipment (category_id, name, location, description) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [panelCategory, p.name, p.location, p.description]
      );
    }
  }

  console.log('Equipment created');

  // ============================================================
  // KONTROL TAKVİMLERİ
  // ============================================================
  const allEquipment = (await query('SELECT id, category_id, name FROM equipment WHERE is_active = true')).rows;
  const checkTypes = (await query('SELECT id, name FROM check_types')).rows;

  const rutinId = checkTypes.find((c: any) => c.name === 'Rutin Kontrol')?.id;
  const gorselId = checkTypes.find((c: any) => c.name === 'Görsel Kontrol')?.id;
  const testId = checkTypes.find((c: any) => c.name === 'Çalıştırma Testi')?.id;
  const bakimId = checkTypes.find((c: any) => c.name === 'Bakım')?.id;

  for (const eq of allEquipment) {
    // Her ekipmana rutin kontrol (günlük)
    if (rutinId) {
      await query(
        'INSERT INTO check_schedules (equipment_id, check_type_id, interval_hours) VALUES ($1, $2, $3) ON CONFLICT (equipment_id, check_type_id) DO NOTHING',
        [eq.id, rutinId, 24]
      );
    }
    // Jeneratörler: haftalık çalıştırma testi, aylık bakım
    if (eq.category_id === 1) {
      if (testId) await query('INSERT INTO check_schedules (equipment_id, check_type_id, interval_hours) VALUES ($1, $2, $3) ON CONFLICT (equipment_id, check_type_id) DO NOTHING', [eq.id, testId, 168]);
      if (bakimId) await query('INSERT INTO check_schedules (equipment_id, check_type_id, interval_hours) VALUES ($1, $2, $3) ON CONFLICT (equipment_id, check_type_id) DO NOTHING', [eq.id, bakimId, 720]);
    }
    // Klima: haftalık görsel kontrol
    if (eq.category_id === 2 && gorselId) {
      await query('INSERT INTO check_schedules (equipment_id, check_type_id, interval_hours) VALUES ($1, $2, $3) ON CONFLICT (equipment_id, check_type_id) DO NOTHING', [eq.id, gorselId, 168]);
    }
  }

  console.log('Schedules created');

  // ============================================================
  // KONTROL KAYITLARI - Son 30 günlük gerçekçi veriler
  // ============================================================
  const users = (await query('SELECT id FROM users WHERE is_active = true')).rows;
  const userIds = users.map((u: any) => u.id);

  // Jeneratör field definition IDs
  const genFields = (await query('SELECT id, field_name FROM check_field_definitions WHERE category_id = 1')).rows;
  const acFields = (await query('SELECT id, field_name FROM check_field_definitions WHERE category_id = 2')).rows;

  const getFieldId = (fields: any[], name: string) => fields.find((f: any) => f.field_name === name)?.id;

  // Son 30 gün için kontrol kayıtları oluştur
  const now = new Date();

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);

    // Sabah 08:00 ve akşam 20:00 kontrolleri
    for (const hour of [8, 20]) {
      date.setHours(hour, Math.floor(Math.random() * 30), 0, 0);
      const checkedAt = date.toISOString();
      const userId = userIds[Math.floor(Math.random() * userIds.length)];

      for (const eq of allEquipment) {
        // Rutin kontrol - günlük (sabah vardiyası)
        if (hour === 8 && rutinId) {
          const status = Math.random() > 0.92 ? 'warning' : Math.random() > 0.98 ? 'critical' : 'ok';
          const logRes = await query(
            'INSERT INTO check_logs (equipment_id, check_type_id, user_id, status, notes, checked_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [eq.id, rutinId, userId, status, status !== 'ok' ? 'Dikkat edilmeli' : null, checkedAt]
          );
          const logId = logRes.rows[0].id;

          // Jeneratör field values
          if (eq.category_id === 1) {
            const fuelLevel = 70 + Math.floor(Math.random() * 25);
            const engineTemp = 75 + Math.floor(Math.random() * 15);
            const oilPressure = (3.5 + Math.random() * 1.5).toFixed(1);
            const batteryVoltage = (24.0 + Math.random() * 2).toFixed(1);
            const runningHours = 1200 + dayOffset * 2 + Math.floor(Math.random() * 5);

            const genFieldValues = [
              { fieldDefId: getFieldId(genFields, 'fuel_level'), value: String(fuelLevel) },
              { fieldDefId: getFieldId(genFields, 'engine_temp'), value: String(engineTemp) },
              { fieldDefId: getFieldId(genFields, 'oil_pressure'), value: oilPressure },
              { fieldDefId: getFieldId(genFields, 'battery_voltage'), value: batteryVoltage },
              { fieldDefId: getFieldId(genFields, 'running_hours'), value: String(runningHours) },
              { fieldDefId: getFieldId(genFields, 'engine_status'), value: 'Durdu' },
              { fieldDefId: getFieldId(genFields, 'coolant_temp'), value: String(35 + Math.floor(Math.random() * 10)) },
              { fieldDefId: getFieldId(genFields, 'leak_check'), value: 'true' },
            ].filter(f => f.fieldDefId);

            for (const fv of genFieldValues) {
              await query(
                'INSERT INTO check_field_values (check_log_id, field_def_id, value) VALUES ($1, $2, $3) ON CONFLICT (check_log_id, field_def_id) DO NOTHING',
                [logId, fv.fieldDefId, fv.value]
              );
            }
          }

          // Klima field values
          if (eq.category_id === 2) {
            const setTemp = eq.name.includes('CRAC') ? 22 : 24;
            const roomTemp = setTemp + (Math.random() * 3 - 1);
            const humidity = 40 + Math.floor(Math.random() * 15);

            const acFieldValues = [
              { fieldDefId: getFieldId(acFields, 'set_temp'), value: String(setTemp) },
              { fieldDefId: getFieldId(acFields, 'room_temp'), value: roomTemp.toFixed(1) },
              { fieldDefId: getFieldId(acFields, 'humidity'), value: String(humidity) },
              { fieldDefId: getFieldId(acFields, 'filter_status'), value: dayOffset > 20 ? 'Kirli' : 'Temiz' },
              { fieldDefId: getFieldId(acFields, 'compressor_status'), value: 'Çalışıyor' },
              { fieldDefId: getFieldId(acFields, 'airflow'), value: 'Normal' },
              { fieldDefId: getFieldId(acFields, 'drain_check'), value: 'true' },
              { fieldDefId: getFieldId(acFields, 'noise_level'), value: 'Normal' },
            ].filter(f => f.fieldDefId);

            for (const fv of acFieldValues) {
              await query(
                'INSERT INTO check_field_values (check_log_id, field_def_id, value) VALUES ($1, $2, $3) ON CONFLICT (check_log_id, field_def_id) DO NOTHING',
                [logId, fv.fieldDefId, fv.value]
              );
            }
          }
        }
      }
    }

    // Haftalık kontroller (Pazartesi günleri)
    if (date.getDay() === 1) {
      date.setHours(10, 0, 0, 0);
      const checkedAt = date.toISOString();
      const userId = userIds[Math.floor(Math.random() * userIds.length)];

      for (const eq of allEquipment) {
        // Jeneratör çalıştırma testi
        if (eq.category_id === 1 && testId) {
          await query(
            'INSERT INTO check_logs (equipment_id, check_type_id, user_id, status, notes, checked_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [eq.id, testId, userId, 'ok', '15 dakika yüklü çalıştırma testi yapıldı. Tüm parametreler normal.', checkedAt]
          );
        }
        // Klima görsel kontrol
        if (eq.category_id === 2 && gorselId) {
          await query(
            'INSERT INTO check_logs (equipment_id, check_type_id, user_id, status, notes, checked_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [eq.id, gorselId, userId, 'ok', 'Fiziksel durum normal, filtre temiz.', checkedAt]
          );
        }
      }
    }
  }

  console.log('Check logs with field values created (30 days of data)');

  // ============================================================
  // Son kontrol: Bazı ekipmanları "gecikmiş" durumuna düşürelim (demo amaçlı)
  // ============================================================
  // CRAC-03 ve Split Klima - UPS Odası'nın son kontrolünü 2 gün öncesine çekelim
  // Bu sayede dashboard'da sarı/kırmızı göstergeler olsun
  const cracEquipment = allEquipment.find((e: any) => e.name.includes('CRAC-03'));
  if (cracEquipment) {
    const twoDaysAgo = new Date(now);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    await query(
      "DELETE FROM check_logs WHERE equipment_id = $1 AND checked_at > $2",
      [cracEquipment.id, twoDaysAgo.toISOString()]
    );
    console.log('CRAC-03 logs trimmed for overdue demo');
  }

  console.log('✅ Seed completed successfully!');
  console.log('Login: admin / Password1');

  await pool.end();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
