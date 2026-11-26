// Provimento nº 006/2006-CJRMB (DJ nº 3750, de 20/10/2006), art. 1º, § 2º: atos que independem de despacho
// nos processos cíveis. Aplicável às Comarcas do Interior pelo Provimento nº 006/2009-CJCI, art. 1º.
//
// [PENDENTE] Transcrição obtida por OCR dos PDFs oficiais do TJPA (CMSPortal idArquivo=3238 e idArquivo=192819).
// Conferir cada inciso contra o PDF oficial antes de a v1 ir ao Fórum. As remissões são ao CPC de 1973.
//
// revisar: true marca o inciso com o selo "Revisar aplicabilidade com o juízo". Ele fica desabilitado até
// existir modelo validado pelo juízo. A ferramenta não decide se o inciso ainda se aplica.

export const CONFERENCIA_CATALOGO = Object.freeze({
  conferido: false,
  fonte: 'OCR dos PDFs oficiais do TJPA (CMSPortal, idArquivo=3238 e idArquivo=192819)',
  aviso: 'Texto obtido por OCR, pendente de conferência contra o PDF oficial. As remissões são ao CPC de 1973.',
});

const C = (inciso, rotulo, textoLiteral, remissaoCPC1973 = null, observacao = '', revisar = false) =>
  Object.freeze({ inciso, rotulo, textoLiteral, remissaoCPC1973, observacao, revisar });

export const CATALOGO_PROV_006_2006 = Object.freeze([
  C('I', 'Réu não localizado: manifestação do autor',
    'a intimação da parte autora para se manifestar em 5 (cinco) dias quando a parte ré não for localizada e assim o certificar o Oficial de Justiça;'),
  C('II', 'Réplica à contestação',
    'a intimação da parte autora para se manifestar sobre a contestação, quando for apresentada preliminar (CPC, art. 301) ou quando forem juntados documentos, no prazo de 10 (dez) dias (CPC, art. 327);',
    'arts. 301 e 327'),
  C('III', 'Nova data de audiência não realizada',
    'a designação, após o nada a opor do Juiz, de nova data para audiência, com a respectiva inclusão em pauta, sempre que o ato não se realizar por motivo justificado;',
    null, 'Depende do nada a opor do juiz, conforme o próprio texto do inciso.'),
  C('IV', 'Cumprimento de carta precatória recebida',
    'a expedição dos mandados e ofícios necessários para o cumprimento de cartas precatórias, independentemente de despacho do Juiz, observando-se o que dispõem os arts. 202, 204 e 209 do Código de Processo Civil, com a inclusão, após o nada a opor do Juiz, de audiência em pauta pela própria Secretaria, se for o caso, e a imediata devolução dos respectivos autos ao juízo de origem após a prática do ato deprecado, ressalvadas as diligências relativas a ordens de prisão civil ou correspondente soltura;',
    'arts. 202, 204 e 209', 'Observar as vedações do art. 1º, § 3º (por exemplo, mandado de prisão civil e mandado de busca e apreensão).'),
  C('V', 'Informações sobre carta precatória expedida',
    'a solicitação de informações sobre o cumprimento de cartas precatórias expedidas, após o transcurso de 30 (trinta) dias de sua postagem;'),
  C('VI', 'Documento novo: manifestação da parte',
    'a intimação da parte para falar sobre a juntada de documento novo, no prazo de 05 (cinco) dias (CPC, art. 398);',
    'art. 398'),
  C('VII', 'Regularização de procuração',
    'a intimação do advogado para fazer prova do mandato outorgado pelo constituinte, no prazo de 15 (quinze) dias, sempre que o patrono intervier no processo sem apresentar procuração, ressalvada a hipótese do art. 5º, § 1º, da Lei n. 8.906/94 (Estatuto da Advocacia e da OAB), e do art. 37 do Código de Processo Civil;',
    'art. 37'),
  C('VIII', 'Expedição de carta precatória',
    'a expedição de carta precatória para a prática dos atos processuais que tiverem que se realizar fora dos limites territoriais da Comarca, inclusive os de citação e intimação, bastando, para tanto, a alegação da parte ou da certidão do Oficial de Justiça;',
    null, 'Não abrange carta precatória para penhora e avaliação de bens, vedada pelo art. 1º, § 3º.'),
  C('IX', 'Edital de citação',
    'a expedição de edital de citação, com o prazo de 30 (trinta) dias, nas hipóteses do art. 231 do Código de Processo Civil (quando desconhecido ou incerto o réu; quando ignorado, incerto ou inacessível o lugar em que se encontrar; nos casos expressos em lei), observados os requisitos de seu art. 232;',
    'arts. 231 e 232'),
  C('X', 'Intimação do Ministério Público',
    'a intimação do Ministério Público, sempre que sua intervenção no processo for obrigatória, observada a regra do art. 83, I do Código de Processo Civil (terá vista dos autos depois das partes);',
    'art. 83, I'),
  C('XI', 'Recolhimento de custas',
    'a intimação da parte para recolher custas judiciais, inclusive as remanescentes, devendo, decorridos 30 (trinta) dias sem atendimento, certificar nos autos a respeito e promover a conclusão;'),
  C('XII', 'Contrafé para citação',
    'a intimação da parte autora para que providencie contrafé em número suficiente para a citação do(s) réu(s);',
    null, 'Contrafé pressupõe cópias físicas; conferir a utilidade no processo eletrônico.'),
  C('XIII', 'Habilitação de sucessores',
    'a intimação da parte contrária para, em 5 (cinco) dias, manifestar-se sobre pedido de habilitação de sucessores da parte falecida;'),
  C('XIV', 'Laudo pericial em atraso',
    'a intimação do Perito para, em 10 (dez) dias, apresentar laudo, se vencido o prazo estabelecido pelo Juiz;'),
  C('XV', 'Prosseguimento após suspensão',
    'a intimação do autor ou exequente para dizer sobre o prosseguimento do feito, se decorrido o prazo deferido de suspensão do processo, sem a manifestação da parte interessada;'),
  C('XVI', 'Ofício ao juízo deprecante',
    'a expedição de ofício ao juízo deprecante, uma vez solicitadas informações a respeito do andamento da carta precatória ou do ofício;',
    null, 'Conferir com o juízo a compatibilidade com o art. 1º, § 3º, item 4, que veda à secretaria subscrever ofícios a órgãos jurisdicionais do Poder Judiciário.', true),
  C('XVII', 'Retorno de carta precatória',
    'a abertura de vista à parte interessada, sempre que a carta precatória retornar a juízo;'),
  C('XVIII', 'Registro de penhora por termo',
    'a determinação de registro da penhora, realizada por termo, na hipótese de não efetuado o registro;'),
  C('XIX', 'Resposta a ofício',
    'a intimação das partes quanto a respostas a ofícios relativos a diligências determinadas pelo juízo;'),
  C('XX', 'Diligência negativa: vista ao autor',
    'a abertura de vista ao autor ou exequente das cartas e certidões negativas dos Oficiais de Justiça e das praças e leilões negativos;'),
  C('XXI', 'Restituição de laudo ou mandado',
    'a intimação do Perito ou Oficial de Justiça para restituir, em 24 (vinte e quatro) horas, laudo ou mandado não devolvido no prazo legal, após o que o fato será levado ao conhecimento do Juiz;'),
  C('XXII', 'Retorno da instância superior',
    'a intimação das partes para, em 15 (quinze) dias, procederem aos requerimentos pertinentes, retornando os autos da Instância Superior;'),
  C('XXIII', 'Mandado de segurança: informações',
    'nos mandados de segurança, chegando as informações da autoridade impetrada, verificar se são tempestivas. Em caso positivo, fazer a juntada e abrir, de pronto, vista dos autos ao Ministério Público. Com o parecer deste, realizar imediata conclusão para sentença. Se as informações forem intempestivas, ultimar juntada e certificar nos autos, efetuando incontinenti a conclusão;'),
  C('XXIV', 'Restituição de autos por advogado',
    'a intimação de advogado, pelo Diário da Justiça, para restituir em 24 (vinte e quatro) horas, processo não devolvido no prazo legal, sendo que no caso de não-atendimento o fato será levado ao conhecimento do Juiz;',
    null, 'Pressupõe autos físicos com carga; sem correspondência direta no processo eletrônico.', true),
  C('XXV', 'Cautelar: ação principal',
    'a certidão, nas ações cautelares, depois de transcorrido 30 (trinta) dias da efetivação da medida, acerca da interposição ou não da ação principal, procedendo-se à conclusão dos autos ao Juiz em caso negativo;',
    null, 'Ação cautelar autônoma do CPC de 1973; sem correspondência direta no CPC de 2015.', true),
  C('XXVI', 'Separação e divórcio: audiência',
    'a designação, após o nada a opor do Juiz, de audiência de conciliação, instrução e julgamento, bem como vista obrigatória ao Ministério Público, nas ações de separação e divórcio, consensual ou litigioso;',
    null, 'Envolve separação judicial e regime anterior à EC 66/2010 e ao CPC de 2015.', true),
  C('XXVII', 'Conversão de separação: apensamento',
    'o apensamento aos autos de separação judicial nos pedidos de sua conversão em divórcio, quando a inicial não vier instruída com cópia da certidão de casamento com a devida averbação;',
    null, 'Envolve separação judicial e apensamento de autos físicos.', true),
  C('XXVIII', 'Conversão de separação: Ministério Público',
    'a remessa dos autos ao Ministério Público para manifestação, nos pedidos de conversão de separação em divórcio;',
    null, 'Envolve separação judicial e regime anterior à EC 66/2010.', true),
]);

export function buscarInciso(inciso) {
  return CATALOGO_PROV_006_2006.find((c) => c.inciso === inciso) || null;
}

// Vedações do art. 1º, § 3º: documentos que o Diretor de Secretaria NÃO subscreve nos processos cíveis.
export const VEDACOES_PROV_006_2006 = Object.freeze([
  'Carta Precatória para penhora e avaliação de bens',
  'Alvarás de qualquer natureza',
  'Mandados de Prisão Civil',
  'Ofícios e demais expedientes para Órgãos Administrativos ou Jurisdicionais do Poder Judiciário dos Estados ou da União',
  'Informações para instruir Agravos de Instrumento',
  'Mandados de Desocupação Voluntária ou Compulsória de Imóveis',
  'Mandado de Busca e Apreensão de Bens',
]);

// Padrões de texto que indicam documento vedado como objeto do ato. Usados para bloquear modelos.
export const PADROES_VEDADOS = Object.freeze([
  { re: /alvara/, motivo: 'alvará (art. 1º, § 3º, item 2)' },
  { re: /mandados? de prisao/, motivo: 'mandado de prisão civil (art. 1º, § 3º, item 3)' },
  { re: /prisao civil/, motivo: 'mandado de prisão civil (art. 1º, § 3º, item 3)' },
  { re: /busca e apreensao/, motivo: 'mandado de busca e apreensão de bens (art. 1º, § 3º, item 7)' },
  { re: /desocupacao/, motivo: 'mandado de desocupação de imóvel (art. 1º, § 3º, item 6)' },
  { re: /precatoria[^.]{0,60}penhora|penhora e avaliacao/, motivo: 'carta precatória para penhora e avaliação (art. 1º, § 3º, item 1)' },
  { re: /informac(ao|oes)[^.]{0,60}agravo de instrumento/, motivo: 'informações para agravo de instrumento (art. 1º, § 3º, item 5)' },
]);
