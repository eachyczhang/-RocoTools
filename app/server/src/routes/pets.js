const { Router } = require('express');
const petsService = require('../services/pets');

const router = Router();

router.get('/', (req, res) => {
  res.json(petsService.list(req.query));
});

router.get('/:uid', (req, res) => {
  const result = petsService.getByUid(req.params.uid);
  if (!result) return res.status(404).json({ error: 'Pet not found' });
  res.json(result);
});

module.exports = router;
