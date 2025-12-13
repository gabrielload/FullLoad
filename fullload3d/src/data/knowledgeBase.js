export const KNOWLEDGE_BASE = [
    // --- LOGIN & ACESSO ---
    { keywords: ["senha", "esqueci", "recuperar", "trocar senha"], answer: "Para recuperar sua senha, clique em 'Esqueci minha senha' na tela de login. Enviaremos um link para o seu e-mail.", type: "solution" },
    { keywords: ["login", "entrar", "acessar", "logar"], answer: "Use seu e-mail e senha cadastrados. Se tiver problemas, verifique se o Caps Lock está ativado ou tente recuperar a senha.", type: "solution" },
    { keywords: ["criar conta", "novo usuário", "nova conta", "cadastrar usuário", "permissão de acesso", "sem acesso"], answer: "Novas contas de usuário são criadas apenas pelos administradores. Solicite ao gestor da sua empresa.", type: "solution" },
    { keywords: ["sair", "logout", "deslogar"], answer: "Para sair, clique no ícone do seu perfil no canto superior direito e selecione 'Sair'.", type: "solution" },
    { keywords: ["perfil", "meus dados", "alterar dados"], answer: "Você pode editar seus dados na página de Perfil, acessível pelo menu superior.", type: "solution" },

    // --- DASHBOARD ---
    { keywords: ["dashboard", "painel", "resumo", "visão geral"], answer: "O Dashboard mostra um resumo da sua operação: cargas totais, em andamento e estatísticas gerais.", type: "solution" },
    { keywords: ["kpi", "indicadores", "métricas"], answer: "Nossos indicadores mostram volume transportado, número de viagens e eficiência da frota.", type: "solution" },
    { keywords: ["gráfico", "grafico", "visualizar"], answer: "Os gráficos no Dashboard ajudam a entender o fluxo de cargas mensal e o status dos pedidos.", type: "solution" },

    // --- PLANOS 3D (FULLLOAD3D) ---
    { keywords: ["plano 3d", "novo plano", "criar plano", "otimizar"], answer: "Para criar um plano, vá em 'FullLoad3D', selecione o caminhão, adicione as mercadorias e clique em 'Otimizar Carga'.", type: "solution" },
    { keywords: ["salvar plano", "guardar plano"], answer: "Após criar um plano, clique no ícone de disquete (Salvar) na barra de ferramentas do editor 3D.", type: "solution" },
    { keywords: ["carregar plano", "abrir plano", "editar plano"], answer: "Seus planos salvos aparecem na lista de 'Planos Recentes' ou na página de 'Carregamento'.", type: "solution" },
    { keywords: ["pdf plano", "exportar plano", "imprimir plano"], answer: "Dentro do editor 3D, clique no ícone de PDF para gerar um relatório detalhado do carregamento.", type: "solution" },
    { keywords: ["rotacionar", "girar", "mexer 3d"], answer: "Use o botão esquerdo do mouse para girar, o direito para mover e o scroll para dar zoom na visualização 3D.", type: "solution" },
    { keywords: ["item caindo", "item fora", "sobra"], answer: "Se itens sobrarem, tente mudar o caminhão para um maior ou otimizar novamente com parâmetros diferentes.", type: "solution" },
    { keywords: ["empilhamento", "pilha", "empilhar"], answer: "O sistema calcula automaticamente o empilhamento baseado no peso e resistência dos itens.", type: "solution" },

    // --- CAMINHÕES ---
    { keywords: ["caminhão", "veículo", "frota", "adicionar caminhão"], answer: "Gerencie sua frota no menu 'Caminhões'. Lá você pode adicionar, editar ou remover veículos.", type: "solution" },
    { keywords: ["tara", "peso caminhão"], answer: "A Tara é o peso do caminhão vazio. Certifique-se de cadastrar corretamente para cálculos precisos.", type: "solution" },
    { keywords: ["eixos", "rodas"], answer: "Ao cadastrar um veículo, você pode especificar o número de eixos e o limite de peso por eixo.", type: "solution" },
    { keywords: ["bau", "dimensões", "tamanho bau"], answer: "As dimensões do baú (comprimento, largura, altura) são cruciais para o cálculo do 3D.", type: "solution" },

    // --- MERCADORIAS ---
    { keywords: ["mercadoria", "produto", "item", "carga"], answer: "Cadastre seus produtos no menu 'Mercadorias'. Informe peso, dimensões e nome.", type: "solution" },
    { keywords: ["importar", "csv", "excel mercadoria"], answer: "Você pode importar uma lista de mercadorias usando nossa planilha modelo na página de Configurações ou Mercadorias.", type: "solution" },
    { keywords: ["peso mercadoria", "kg", "tonelada"], answer: "O peso de cada unidade deve ser informado em KG.", type: "solution" },
    { keywords: ["volume", "m3", "cubagem"], answer: "O sistema calcula o volume automaticamente baseadas nas dimensões (AxLxP) do item.", type: "solution" },
    { keywords: ["editar mercadoria", "alterar produto"], answer: "Clique no ícone de lápis ao lado de um item na lista de Mercadorias para editar.", type: "solution" },
    { keywords: ["excluir mercadoria", "remover item"], answer: "Use o ícone de lixeira para remover um item. Cuidado: isso pode afetar planos antigos.", type: "solution" },

    // --- RELATÓRIOS ---
    { keywords: ["relatório", "relatorio", "exportar dados"], answer: "Acesse a página 'Relatórios' para baixar dados de mercadorias, veículos e histórico de planos.", type: "solution" },
    { keywords: ["excel", "xlsx", "planilha"], answer: "Todos os nossos relatórios podem ser baixados em formato Excel para você trabalhar os dados.", type: "solution" },
    { keywords: ["pdf relatorio", "imprimir relatorio"], answer: "Você também pode gerar PDFs formatados prontos para impressão na página de Relatórios.", type: "solution" },
    { keywords: ["histórico", "logs", "registros"], answer: "O Histórico de Cargas mostra todos os planos criados, com datas e detalhes.", type: "solution" },

    // --- CONFIGURAÇÕES ---
    { keywords: ["configuração", "ajustes", "setup"], answer: "No menu Configurações você pode baixar modelos de importação e gerenciar preferências.", type: "solution" },
    { keywords: ["notificação", "aviso", "alerta"], answer: "Você pode ativar ou desativar notificações por e-mail nas Configurações.", type: "solution" },

    // --- SUPORTE GERAL ---
    { keywords: ["erro", "bug", "travou", "não funciona"], answer: "Se encontrou um erro, tente recarregar a página. Se persistir, chame nosso suporte humano!", type: "solution" },
    { keywords: ["lento", "demora", "travando"], answer: "O carregamento 3D pode exigir um pouco do computador. Feche outras abas para melhorar a performance.", type: "solution" },
    { keywords: ["contato", "telefone", "email suporte"], answer: "Nosso canal principal é o chat ou o e-mail suporte@fullload.com.", type: "solution" },
    { keywords: ["preço", "plano", "valor", "pagamento"], answer: "Para dúvidas sobre faturamento ou upgrade de plano, fale com o comercial no WhatsApp.", type: "solution" },

    // --- PERSONALIDADE / SOCIAL ---
    { keywords: ["oi", "olá", "bom dia", "boa tarde", "boa noite"], answer: "Olá! Eu sou o Loadzinho 🤖. Tudo bem com você? Como posso ajudar?", type: "chat" },
    { keywords: ["tudo bem", "como vai"], answer: "Eu sou um robô, então estou sempre 100%! E você, precisa de ajuda com alguma carga?", type: "chat" },
    { keywords: ["obrigado", "valeu", "grato", "agradeço"], answer: "Disponha! É um prazer ajudar. 🚚💨", type: "chat" },
    { keywords: ["quem é você", "seu nome"], answer: "Eu sou o Loadzinho, o assistente virtual da FullLoad! 🤖", type: "chat" },
    { keywords: ["tchau", "adeus", "até logo"], answer: "Tchauzinho! Se precisar, estou por aqui. 👋", type: "chat" },
    { keywords: ["surpresa", "piada", "fale algo"], answer: "Por que o caminhão não entra no cinema? Porque o trailer é muito grande! 😂🚚", type: "chat" },

    // --- FALLBACKS INTENCIONAIS PARA HANDOFF ---
    { keywords: ["falar com atendente", "humano", "pessoa", "especialista", "socorro", "ajuda humana"], answer: "human_handoff", type: "solution" } // Solution type triggers feedback logic in a way, but we will handle handoff specially
];
