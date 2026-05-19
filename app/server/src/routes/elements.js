const { Router } = require('express');
const elementsService = require('../services/elements');

const router = Router();

router.get('/', (req, res) => {
  res.json(elementsService.getAll());
});

router.get('/multipliers', (req, res) => {
  res.json(elementsService.getMultipliers());
});

router.get('/:id', (req, res) => {
  const result = elementsService.getById(+req.params.id);
  if (!result) return res.status(404).json({ error: 'Element not found' });
  res.json(result);
});

module.exports = router;
