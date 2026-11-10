# Sweety REST API Specification

All protected endpoints require an authenticated JWT token (supplied via HTTP-only cookie `token` or `Authorization: Bearer <token>`).

## Authentication
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user (`name`, `email`, `password`, `role`) | No |
| POST | `/api/auth/login` | Authenticate user credentials | No |
| POST | `/api/auth/logout` | Invalidate cookie session | Yes |
| GET | `/api/auth/me` | Fetch authenticated user profile | Yes |
| PUT | `/api/auth/profile` | Update profile information | Yes |

## Readings & Analytics
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/api/readings` | Add a new glucose reading (current date only) | Patient |
| GET | `/api/readings` | List readings with pagination (`?page=1&limit=20`) | Patient |
| PUT | `/api/readings/:id` | Edit reading within 4 hours | Patient |
| DELETE | `/api/readings/:id` | Delete reading with ownership verification | Patient |
| GET | `/api/readings/reports` | Get date-bounded report (`?type=daily\|month-to-date\|monthly`) | Patient |
| GET | `/api/readings/export-csv` | Download CSV with standard columns | Patient |

## Doctors & Consultations
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/doctors` | List verified doctors with experience & plans | No |
| GET | `/api/doctors/:id` | Get doctor profile and consultation details | No |
| GET | `/api/doctors/portal/patients` | List authorized patients for logged in doctor | Doctor |
| GET | `/api/doctors/portal/patients/:id/readings` | View authorized patient's readings | Doctor |

## Subscriptions & Payments
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/subscriptions/plans` | List ₹250, ₹400, ₹600 consultation plans | No |
| GET | `/api/subscriptions/my` | Get current patient subscription status | Patient |
| POST | `/api/subscriptions/submit-payment` | Submit payment reference & receipt note | Patient |
| GET | `/api/subscriptions/pending-payments` | View pending payment queue | Doctor |
| POST | `/api/subscriptions/verify-payment` | Approve or reject payment (`action`, `reason`) | Doctor |

## Chat & Follow-ups
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/chat/messages/:partnerId` | Get messages & access status | Yes |
| POST | `/api/chat/messages` | Send message (enforces active access) | Yes |
| POST | `/api/chat/follow-up` | Request follow-up when locked | Patient |
| POST | `/api/chat/follow-up/review` | Approve/reject follow-up request | Doctor |

## Notifications
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/api/notifications` | Get user notifications & unread count | Yes |
| PUT | `/api/notifications/:id/read` | Mark single notification as read | Yes |
| PUT | `/api/notifications/mark-all-read` | Mark all notifications as read | Yes |
