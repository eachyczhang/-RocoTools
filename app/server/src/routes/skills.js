const { Router } = require('express');
const skillsService = require('../services/skills');

const router = Router();

router.get('/', (req, res) => {
  res.json(skillsService.list(req.query));
});

router.get('/:uid', (req, res) => {
  const result = skillsService.getByUid(req.params.uid);
  if (!result) return res.status(404).json({ error: 'Skill not found' });
  res.json(result);
});

module.exports = router;
