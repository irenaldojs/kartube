# ADR-0004 — Checksum canônico de pistas

- **Estado:** Aceito para o schema 1 experimental
- **Data:** 2026-11-13

## Contexto

Cliente TS e servidor Rust precisam identificar os mesmos dados de gameplay. Serializar JSON diretamente depende da ordem das chaves e da representação decimal dos números; listas de checkpoints e spawns podem mudar de ordem sem alterar a pista.

## Decisão

Usar SHA-256 dos bytes canônicos binários especificados em [Dados e contratos](../16-formato-dados.md#checksum-canônico-de-pistas--schema-1). Ordenar entidades por identificador/slot, usar coordenadas IEEE-754 binary64 little-endian e normalizar zero negativo. Excluir checksum e campos desconhecidos. Validar estrutura antes do cálculo; verificar igualdade de hash explicitamente nas fronteiras de carregamento.

TypeScript usa Web Crypto (HTTPS/localhost); Rust usa sha2. O arquivo de bytes esperado foi gerado independentemente em Python (`struct`/`hashlib`) e é consumido pelos testes das duas implementações. serde_json usa `float_roundtrip` para conversão decimal corretamente arredondada a binary64.

## Alternativas

JSON sem canonicalização deixa divergências de ordem e números. Canonical JSON completo adiciona regras de representação textual que não são necessárias para o contrato mínimo atual.

## Consequências e evidência

`fixtures/track-canonical.hex` e checksum em `track-definition.json` passam nas duas linguagens, incluindo frações, expoente, reordenação e normalização de zero negativo. `track-cases.json` testa estrutura e integridade com os mesmos casos TS/Rust. O formato fica limitado aos campos de gameplay conhecidos: adicionar campo que altere regras exige revisão do schema e do cabeçalho canônico, além da atualização dos leitores. Pistas com o checksum opaco do primeiro parser precisam regenerá-lo; ainda não há conteúdo publicado para migrar.

A decisão não aceita os ADRs de renderização, sincronização ou empacotamento; as respectivas provas continuam pendentes.
