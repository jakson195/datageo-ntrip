# Plugin AutoCAD — DATAGEO NTRIP

Plugin `.NET` para importar no AutoCAD os desenhos exportados do ambiente CAD web (`/area-cliente/cad`).

## Comandos

| Comando | Descrição |
|---------|-----------|
| `DATAGEOIMPORT` | Importa um arquivo **DXF** ou **DWG** exportado do DATAGEO |
| `DATAGEOZOOM` | Enquadra o desenho importado (extents) |
| `DATAGEOINFO` | Informações do plugin e fluxo de trabalho |

## Pré-requisitos

- Windows 64 bits
- AutoCAD **2020–2025** (64 bits)
- [.NET Framework 4.8](https://dotnet.microsoft.com/download/dotnet-framework/net48)
- Visual Studio 2022 **ou** Build Tools (para compilar)

## Compilar

1. Ajuste a versão do AutoCAD no `.csproj` se necessário (`ACAD_VERSION`, padrão `2024`).
2. Confirme que existem as DLLs em  
   `C:\Program Files\Autodesk\AutoCAD 2024\`
3. Compile:

```powershell
cd autocad-plugin\DatageoNtripCad
dotnet build -c Release
```

Saída: `bin\Release\net48\DatageoNtripCad.dll`

## Instalar no AutoCAD

### Opção A — NETLOAD (rápido, para teste)

1. No AutoCAD: `NETLOAD`
2. Selecione `DatageoNtripCad.dll`
3. Execute `DATAGEOIMPORT`

### Opção B — ApplicationPlugins (recomendado)

1. Copie a pasta `PackageContents` gerada (ou monte manualmente):

```
%ProgramFiles%\Autodesk\ApplicationPlugins\DatageoNtripCad\
  PackageContents.xml
  Contents\
    DatageoNtripCad.dll
```

2. Reinicie o AutoCAD — o plugin carrega automaticamente.

## Fluxo com o app web

1. No DATAGEO: **CAD → Exportar DXF** (ou DWG)
2. No AutoCAD: `DATAGEOIMPORT` → selecione o arquivo
3. `DATAGEOZOOM` para enquadrar

Camadas, pontos RTK, polilinhas e textos exportados pelo app são preservados.

## Solução de problemas

- **DLL não carrega:** confirme .NET 4.8 e AutoCAD 64 bits.
- **Referências não encontradas na compilação:** altere `ACAD_VERSION` no `.csproj` para sua instalação (ex.: `2023`).
- **Desenho fora da tela:** use `DATAGEOZOOM` ou `ZOOM E`.

## Próximas melhorias (roadmap)

- Importação direta via API autenticada (sem arquivo manual)
- Comando para sincronizar pontos RTK do projeto salvo na nuvem
- Suporte a blocos ABNT / layout de prancha
