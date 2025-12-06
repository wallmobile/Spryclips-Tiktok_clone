# Admin Panel - Organized Structure

Esta pasta contém todos os arquivos relacionados ao Admin Panel organizados por frontend e backend.

## Estrutura de Pastas

```
admin/
├── frontend/          # Arquivos do Frontend do Admin Panel
│   ├── components/    # Componentes React do Admin
│   └── api/          # API calls do Admin
│
└── backend/          # Arquivos do Backend do Admin Panel
    ├── routes/       # Rotas da API do Admin
    ├── models/       # Modelos de dados do Admin
    └── middleware/   # Middlewares do Admin
```

## Arquivos Admin Relacionados

### Frontend
- `frontend/src/components/AdminPanel.js` - Componente principal do Admin Panel
- `frontend/src/components/AdminPanel.css` - Estilos do Admin Panel
- `frontend/src/components/AdminSidebar.js` - Sidebar do Admin
- `frontend/src/components/AdminSidebar.css` - Estilos da Sidebar
- `frontend/src/components/AdminLogin.js` - Login do Admin
- `frontend/src/components/AdminLogin.css` - Estilos do Login
- `frontend/src/api/admin.js` - API calls do Admin

### Backend
- `backend/routes/admin.js` - Todas as rotas do Admin
- `backend/middleware/admin.js` - Middlewares de autenticação Admin
- `backend/models/` - Modelos relacionados ao Admin:
  - Ticket.js
  - LoginIssue.js
  - PaymentIssue.js
  - VideoUploadIssue.js
  - ShadowbanCase.js
  - CommentAppeal.js
  - VideoProcessing.js
  - CDNHealth.js
  - ServerHealth.js
  - ErrorLog.js
  - APIRequest.js
  - Storage.js
  - Report.js
  - Earning.js
  - Withdrawal.js
  - BrandDeal.js
  - Blacklist.js
  - BoostedContent.js
  - HashtagControl.js
  - ABTest.js

## Funcionalidades do Admin Panel

1. **Dashboard** - Estatísticas gerais
2. **User Management** - Gerenciamento de usuários
3. **Video Management** - Gerenciamento de vídeos
4. **Story Management** - Gerenciamento de stories
5. **Comments** - Gerenciamento de comentários
6. **Moderation** - Moderação de conteúdo
7. **Reports & Safety** - Relatórios e segurança
8. **Monetization** - Monetização e pagamentos
9. **Analytics** - Analytics e insights
10. **Search & Recommendation** - Controle de busca e recomendações
11. **Technical System Control** - Controle técnico do sistema
12. **Support & Problem Solving** - Suporte e resolução de problemas

## Como Usar

### Frontend
Todos os componentes do Admin estão em `frontend/src/components/Admin*.js`

### Backend
Todas as rotas do Admin estão em `backend/routes/admin.js` e são acessíveis via `/api/admin/*`




