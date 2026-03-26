import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
    headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("jwt");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── AUTH ──────────────────────────────────────────────────────────
export const validateQr = (code) => api.post("/qr/verify", { code });
export const registerTeam = (code, teamName) =>
    api.post("/team/register", { code, team_name: teamName });
export const loginTeam = (code, teamName) =>
    api.post("/team/join", { code, team_name: teamName });
// ── TASKS ─────────────────────────────────────────────────────────
export const getTask = (variant) => api.get("/tasks/my");   // оставил старое имя
export const getMyTasks = () => api.get("/tasks/my");       // добавил для удобства

// ── SUBMISSIONS / UPLOADS ─────────────────────────────────────────
export const submitFiles = (formData) =>
    api.post("/submissions", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

export const getMySubmissions = () => api.get("/upload/my"); // оставил старый (если бэкенд ещё поддерживает)

// ── QUIZ (team) ───────────────────────────────────────────────────
export const getMyQuiz = () => api.get("/quiz/my");
export const submitAnswer = (question_id, chosen_index) =>
    api.post("/quiz/answer", { question_id, chosen_index });
export const submitBulk = (answers) =>
    api.post("/quiz/answer/bulk", { answers });
export const getMyResults = () => api.get("/quiz/results/my");

// ── RESULTS ───────────────────────────────────────────────────────
export const getResults = () => api.get("/results");   // оставил старый

// ── ADMIN ─────────────────────────────────────────────────────────
export const getAdminSubmissions = () => api.get("/admin/uploads"); // старый
export const adminGetUploads = () => api.get("/admin/uploads");     // новый
export const adminGetUnchecked = () => api.get("/admin/uploads/unchecked");

export const scoreTeam = (teamId, score, nomination) =>
    api.post(`/admin/teams/${teamId}/score`, { score, nomination });

export const disqualifyTeam = (teamId, reason) =>
    api.post(`/admin/teams/${teamId}/disqualify`, { reason });

export const adminGetTeams = () => api.get("/admin/teams");

export const adminCheckUpload = (id, checked) =>
    api.patch(`/admin/uploads/${id}/check`, { is_checked: checked });

export const adminLogin = (password) => api.post("/admin/login", { password });

// ── ADMIN — Quiz Questions ────────────────────────────────────────
export const adminGetQuestions = (category) =>
    api.get("/admin/quiz/questions", { params: category ? { category } : {} });

export const getRating     = ()               => api.get('/rating/')
export const getMyRating   = ()               => api.get('/rating/me')

export const adminAddQuestion = (data) => api.post("/admin/quiz/questions", data);
export const adminUpdateQuestion = (id, data) =>
    api.put(`/admin/quiz/questions/${id}`, data);
export const adminDeleteQuestion = (id) =>
    api.delete(`/admin/quiz/questions/${id}`);
export const adminGetQuestionsStats = () => api.get("/admin/quiz/questions");

// ── ADMIN — Quiz Results ──────────────────────────────────────────
export const adminGetAllResults = () => api.get("/admin/quiz/results");
export const adminGetTeamResult = (teamId) =>
    api.get(`/admin/quiz/results/${teamId}`);
export const adminGetSummary = () => api.get("/admin/quiz/summary");

export default api;