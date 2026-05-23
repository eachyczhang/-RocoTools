const express = require('express');
const router = express.Router();
const { getDb } = require('../../db/connection');

// ============================================================
// 数据库导出 Excel
// ============================================================
router.get('/export-excel', (req, res) => {
  const XLSX = require('xlsx');
  const db = getDb();

  try {
    const wb = XLSX.utils.book_new();

    // Column name → Chinese label mapping
    const FIELD_LABELS = {
      id: 'ID',
      uid: 'UID',
      key: '标识键',
      name: '名称',
      color: '颜色',
      immunity: '免疫效果',
      strong_against: '克制属性',
      resisted_by: '被抵抗属性',
      weak_to: '弱点属性',
      resistant_to: '抗性属性',
      element_id: '属性ID',
      sub_element_id: '副属性ID',
      category: '分类',
      cost: '能量消耗',
      power: '威力',
      description: '描述',
      version: '版本',
      manual_edit: '手动编辑',
      pet_id: '图鉴编号',
      ability_name: '特性名称',
      ability_desc: '特性描述',
      hp: '生命',
      speed: '速度',
      atk: '物攻',
      matk: '魔攻',
      def: '物防',
      mdef: '魔防',
      total: '总种族值',
      pet_uid: '精灵UID',
      egg_group_id: '蛋组ID',
      egg_group_name: '蛋组名称',
      height: '身高',
      weight: '体重',
      location: '分布地点',
      evolution_chain: '进化链',
      restrain_strong: '克制',
      restrain_weak: '被克制',
      restrain_resist: '抵抗',
      restrain_resisted: '被抵抗',
      skill_type: '技能类型',
      level: '习得等级',
      element: '属性',
      type: '类别',
      skill_ref_uid: '关联技能UID',
      sort_order: '排序',
      stat_up: '增加属性',
      stat_down: '减少属性',
      sub_natures: '子性格',
      is_current: '当前赛季',
      pass_pets: '通行证精灵',
      legend_pet: '传说精灵',
      season_pets: '赛季限定精灵',
      shiny_pets: '异色精灵',
      start_date: '开始日期',
      end_date: '结束日期',
      note: '备注',
      season_id: '赛季ID',
      sub_type: '子类型',
      pet_name: '精灵名称',
      periods: '时间段',
      row_order: '排序',
      period: '期数',
      monthly_id: '月刊ID',
      tab_key: '标签键',
      label: '显示名称',
      route: '路由路径',
      parent_key: '父级键',
      is_visible: '是否显示',
      created_at: '创建时间',
      updated_at: '更新时间',
    };

    function formatHeader(key) {
      const label = FIELD_LABELS[key];
      return label ? `${label}(${key})` : key;
    }

    function formatJsonArray(val) {
      if (val === null || val === undefined || val === '') return '';
      try {
        const arr = JSON.parse(val);
        if (!Array.isArray(arr)) return val;
        if (arr.length > 0 && Array.isArray(arr[0])) {
          return arr.map((route, i) => {
            const routeStr = route.map(item => {
              if (typeof item === 'string') return item;
              if (item.name && 'evolve_level' in item) {
                return item.evolve_level ? `${item.name}(Lv${item.evolve_level})` : item.name;
              }
              return item.name || JSON.stringify(item);
            }).join('→');
            return arr.length > 1 ? `路线${i + 1}: ${routeStr}` : routeStr;
          }).join(' | ');
        }
        return arr.map(item => {
          if (typeof item === 'string') return item;
          if (typeof item === 'object' && item !== null) {
            if (item.name && 'evolve_level' in item) {
              return item.evolve_level ? `${item.name}(Lv${item.evolve_level})` : item.name;
            }
            if (item.start && item.end) {
              return `${item.start}~${item.end}`;
            }
            if (item.name) return item.name;
            return JSON.stringify(item);
          }
          return String(item);
        }).join('、');
      } catch {
        return val;
      }
    }

    const JSON_FIELDS = new Set([
      'strong_against', 'resisted_by', 'weak_to', 'resistant_to',
      'evolution_chain', 'restrain_strong', 'restrain_weak', 'restrain_resist', 'restrain_resisted',
      'sub_natures', 'pass_pets', 'season_pets', 'shiny_pets', 'periods',
    ]);

    const eggGroupMap = {};
    db.prepare('SELECT id, name FROM egg_groups').all().forEach(g => { eggGroupMap[g.id] = g.name; });

    const elementMap = {};
    db.prepare('SELECT id, name FROM elements').all().forEach(e => { elementMap[e.id] = e.name; });

    const exportConfig = [
      { table: 'elements', label: '属性', exclude: ['icon'] },
      { table: 'skills', label: '技能', exclude: ['icon_url'] },
      { table: 'egg_groups', label: '蛋组', exclude: [] },
      { table: 'pets', label: '精灵', exclude: ['image_url', 'thumb_url'] },
      { table: 'pet_details', label: '精灵详情', exclude: ['ability_icon', 'image_default', 'image_shiny', 'image_fruit', 'image_egg'] },
      { table: 'pet_skills', label: '精灵技能', exclude: [] },
      { table: 'pet_egg_groups', label: '精灵蛋组关联', exclude: [] },
      { table: 'natures', label: '性格', exclude: [] },
      { table: 'seasons', label: '赛季', exclude: ['image'] },
      { table: 'season_events', label: '赛季活动', exclude: ['image', 'pet_icon'] },
      { table: 'pika_monthlies', label: '皮卡月刊', exclude: ['concept_male', 'concept_female'] },
      { table: 'pika_monthly_pets', label: '月刊精灵', exclude: ['pet_icon', 'locke_male', 'locke_female'] },
      { table: 'variants_map', label: '多形态映射', exclude: [] },
      { table: 'nav_tabs', label: '导航标签', exclude: ['icon'] },
    ];

    for (const cfg of exportConfig) {
      let rows = db.prepare(`SELECT * FROM ${cfg.table}`).all();

      if (cfg.table === 'pet_egg_groups') {
        rows = rows.map(r => ({
          ...r,
          egg_group_name: eggGroupMap[r.egg_group_id] || '',
        }));
      }

      let colKeys;
      if (rows.length === 0) {
        const cols = db.prepare(`PRAGMA table_info(${cfg.table})`).all();
        colKeys = cols.map(c => c.name).filter(n => !cfg.exclude.includes(n));
        if (cfg.table === 'pet_egg_groups') colKeys.push('egg_group_name');
      } else {
        colKeys = Object.keys(rows[0]).filter(n => !cfg.exclude.includes(n));
      }

      const headers = colKeys.map(formatHeader);

      const dataRows = rows.map(row => {
        return colKeys.map(key => {
          let val = row[key];
          if (val === null || val === undefined) return '';
          if (JSON_FIELDS.has(key) && typeof val === 'string') {
            return formatJsonArray(val);
          }
          if ((key === 'element_id' || key === 'sub_element_id') && val && elementMap[val]) {
            return `${elementMap[val]}(${val})`;
          }
          return val;
        });
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      const colWidths = colKeys.map((key, i) => {
        let maxLen = headers[i].length;
        dataRows.forEach(row => {
          const cellLen = String(row[i]).length;
          if (cellLen > maxLen) maxLen = cellLen;
        });
        return { wch: Math.min(maxLen + 2, 50) };
      });
      ws['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, cfg.label);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `roco_data_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (err) {
    console.error('[Export Excel]', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
