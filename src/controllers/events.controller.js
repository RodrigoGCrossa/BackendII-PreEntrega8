import { EventResponseDTO } from '../dto/event.dto.js';
import * as service from '../services/events.service.js';
export const getEvents = async (req, res) => { const result = await service.listEvents(req.query); res.json({ status: 'success', ...result, data: result.data.map((event) => new EventResponseDTO(event)) }); };
export const postEvent = async (req, res) => res.status(201).json({ status: 'success', payload: new EventResponseDTO(await service.createEvent(req.body, req.user)) });
export const putEvent = async (req, res) => res.json({ status: 'success', payload: new EventResponseDTO(await service.updateEvent(req.params.id, req.body, req.user)) });
export const getEvent = async (req, res) => res.json({ status: 'success', payload: new EventResponseDTO(await service.requireEvent(req.params.id)) });
export const patchStatus = async (req, res) => res.json({ status: 'success', payload: new EventResponseDTO(await service.changeStatus(req.params.id, req.body, req.user)) });
