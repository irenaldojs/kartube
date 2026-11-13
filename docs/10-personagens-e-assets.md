# Personagens, karts, animações e assets

## Estratégia geral

Usar **personagens originais provisórios** desde o primeiro protótipo. Personagens de influenciadores devem ser modelados/lançados **somente depois de verificar autorização** para uso de imagem, nome, semelhança, voz (se houver), publicidade e eventual marca; foto disponível na internet não significa uso permitido em jogo distribuído.

## Pipeline proposto

1. Criar conceito do personagem cartoon e obter licença/autorização de referências visuais quando aplicável.
2. Gerar malha base por ferramenta de IA 3D ou modelagem e revisar qualidade, topologia e licença do serviço.
3. Retopologia/ajustes no Blender, rig humanoide padrão, UV e materiais simples.
4. Aplicar animações compartilhadas: idle, pilotar, virar esquerda/direita, drift, salto, impacto, comemorar e derrota.
5. Adaptar personagem à posição do assento e mãos; definir pontos de ancoragem (cabeça, mãos, kart).
6. Exportar **GLB/glTF 2.0**; validar esqueleto, orientação, escala, textura e tamanho.
7. Cadastrar no manifesto com ID imutável, versões, direitos e variante mobile.
8. Testar em navegador, WebView Tauri desktop e Android.

## Estrutura de assets prevista

```text
assets/
  personagens/  # GLB de pilotos, rigs, texturas e variações
  karts/        # corpo, rodas, aparência e colisores simples
  pistas/       # mapas e props de cenário
  powerups/     # modelos e efeitos de itens/caixas
  efeitos/      # partículas, sprites, shaders e VFX
  audio/        # músicas, SFX e UI com licenças
  interface/    # ícones, HUD e fontes licenciadas
  referencias/  # referências permitidas e notas de produção
```

## Requisitos de um asset pronto

- Fonte e direitos documentados; não conter material protegido sem permissão.
- Nome de arquivo e ID consistentes; coordenadas e escala validadas.
- Rig compatível com conjunto de animações comum.
- Materiais/cartoon legíveis sob condições móveis de luz.
- Orçamento de polígonos, texturas, materiais e memória obtido por benchmark; variantes LOD conforme necessidade.
- GLB testado com carregamento, descarte e falha de rede; asset ausente não pode derrubar a partida.

## Catálogo de direitos (obrigatório quando houver conteúdo externo)

Campos sugeridos: `assetId`, `origin`, `creator`, `sourceUrl`, `license`, `commercialUse`, `modificationAllowed`, `attribution`, `consentRecord`, `expiry`, `reviewedAt`. Documentos pessoais/termos assinados devem permanecer em armazenamento privado apropriado, **não neste repositório público**.
