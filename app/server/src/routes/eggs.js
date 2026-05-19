const { Router } = require('express');
const eggsService = require('../services/eggs');

const router = Router();

router.get('/', (req, res) => {
  res.json(eggsService.getAll());
});

router.get('/:id', (req, res) => {
  const result = eggsService.getById(+req.params.id);
  if (!result) return res.status(404).json({ error: 'Egg group not found' });
  res.json(result);
});

module.exports = router;
