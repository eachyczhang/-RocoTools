const { Router } = require('express');
const petsService = require('../services/pets');

const router = Router();

router.get('/', (req, res) => {
  res.json(petsService.list(req.query));
});

router.get('/shiny', (req, res) => {
  const includeHidden = req.query.all === '1';
  res.json(petsService.getShinyList({ includeHidden }));
});

router.get('/coverage', (req, res) => {
  const elements = req.query.elements ? req.query.elements.split(',') : [];
  res.json(petsService.findByCoverage(elements));
});

router.get('/counter-picks/:uid', (req, res) => {
  const nature = req.query.nature || '';
  const result = petsService.getCounterPicks(req.params.uid, nature);
  if (!result) return res.status(404).json({ error: 'Pet not found' });
  res.json(result);
});

router.get('/:uid/neighbors', (req, res) => {
  const result = petsService.getNeighbors(req.params.uid);
  if (!result) return res.status(404).json({ error: 'Pet not found' });
  res.json(result);
});

router.get('/:uid', (req, res) => {
  const result = petsService.getByUid(req.params.uid);
  if (!result) return res.status(404).json({ error: 'Pet not found' });
  res.json(result);
});

module.exports = router;
