import { Router } from 'express';
import { getUnits, createUnit, deleteUnit } from './units.controller';

const router = Router();

router.get('/', getUnits);
router.post('/', createUnit);
router.delete('/:id', deleteUnit);

export default router;
