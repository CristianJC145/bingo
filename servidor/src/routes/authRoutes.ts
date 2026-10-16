import { Router } from 'express';
import { changeOwnPassword, getCatalogs, login, me } from '../controllers/authController';
import { createUser, deleteUser, listUsers, updateUser } from '../controllers/userController';
import { clearAssignmentRegistrations, createAssignment, deleteAssignment, listAssignments, updateAssignmentMunicipality } from '../controllers/assignmentController';
import { deleteRegistration, listRegistrations, saveRegistration } from '../controllers/registrationController';
import { clearAllAssignedCardRegistrations, listAssignedCards } from '../controllers/assignedCardsController';
import { getDashboard } from '../controllers/dashboardController';
import { requireAdmin, requireAuth } from '../middleware/auth';

const authRouter = Router();

authRouter.post('/api/auth/login', login);
authRouter.get('/api/auth/me', requireAuth, me);
authRouter.put('/api/auth/password', requireAuth, changeOwnPassword);
authRouter.get('/api/catalogs', requireAuth, getCatalogs);

authRouter.get('/api/dashboard', requireAuth, requireAdmin, getDashboard);

authRouter.get('/api/users', requireAuth, requireAdmin, listUsers);
authRouter.post('/api/users', requireAuth, requireAdmin, createUser);
authRouter.put('/api/users/:id', requireAuth, requireAdmin, updateUser);
authRouter.delete('/api/users/:id', requireAuth, requireAdmin, deleteUser);

authRouter.get('/api/assignments', requireAuth, listAssignments);
authRouter.post('/api/assignments', requireAuth, requireAdmin, createAssignment);
authRouter.put('/api/assignments/:id/municipio', requireAuth, requireAdmin, updateAssignmentMunicipality);
authRouter.delete('/api/assignments/:id/registrations', requireAuth, requireAdmin, clearAssignmentRegistrations);
authRouter.delete('/api/assignments/:id', requireAuth, requireAdmin, deleteAssignment);

authRouter.get('/api/assigned-cards', requireAuth, requireAdmin, listAssignedCards);
authRouter.delete('/api/assigned-cards/registrations', requireAuth, requireAdmin, clearAllAssignedCardRegistrations);

authRouter.get('/api/registrations', requireAuth, listRegistrations);
authRouter.put('/api/registrations/:cardNumber', requireAuth, saveRegistration);
authRouter.delete('/api/registrations/:cardNumber', requireAuth, deleteRegistration);

export default authRouter;
