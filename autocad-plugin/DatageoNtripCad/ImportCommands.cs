using System;
using System.IO;
using System.Windows.Forms;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.AutoCAD.EditorInput;
using Autodesk.AutoCAD.Geometry;
using Autodesk.AutoCAD.Runtime;
using Application = Autodesk.AutoCAD.ApplicationServices.Application;

namespace DatageoNtripCad;

public static class ImportCommands
{
    private static string? _lastImportPath;
    private static string? _lastImportTime;

    [CommandMethod("DATAGEOIMPORT", CommandFlags.Modal)]
    public static void ImportDatageoDrawing()
    {
        var doc = Application.DocumentManager.MdiActiveDocument;
        if (doc == null) return;

        var ed = doc.Editor;
        var path = PromptForCadFile();
        if (string.IsNullOrWhiteSpace(path)) return;

        try
        {
            int inserted;
            using (doc.LockDocument())
            {
                inserted = ImportFileIntoCurrentDrawing(doc.Database, path);
            }

            if (inserted <= 0)
            {
                ed.WriteMessage("\nNenhuma entidade importada. Verifique o arquivo exportado do DATAGEO.\n");
                return;
            }

            _lastImportPath = path;
            _lastImportTime = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            ed.WriteMessage(
                $"\nDATAGEO: {inserted} entidade(s) importada(s) de {Path.GetFileName(path)}.\n" +
                "Use DATAGEOZOOM para enquadrar.\n");
        }
        catch (Exception ex)
        {
            ed.WriteMessage($"\nErro ao importar: {ex.Message}\n");
        }
    }

    [CommandMethod("DATAGEOZOOM", CommandFlags.Modal)]
    public static void ZoomToDrawing()
    {
        var doc = Application.DocumentManager.MdiActiveDocument;
        if (doc == null) return;

        doc.SendStringToExecute("._ZOOM _E ", true, false, false);
        doc.Editor.WriteMessage("\nEnquadrado extents do desenho.\n");
    }

    [CommandMethod("DATAGEOINFO", CommandFlags.Modal)]
    public static void ShowInfo()
    {
        var doc = Application.DocumentManager.MdiActiveDocument;
        if (doc == null) return;

        var ed = doc.Editor;
        ed.WriteMessage(
            "\n--- DATAGEO NTRIP CAD Plugin v1.0 ---\n" +
            "1) Exporte DXF ou DWG no app web (area-cliente/cad)\n" +
            "2) No AutoCAD: DATAGEOIMPORT\n" +
            "3) DATAGEOZOOM para enquadrar\n");

        if (!string.IsNullOrWhiteSpace(_lastImportPath))
        {
            ed.WriteMessage($"Última importação: {_lastImportPath}\nData: {_lastImportTime ?? "—"}\n");
        }
    }

    private static string? PromptForCadFile()
    {
        using var dialog = new OpenFileDialog
        {
            Title = "Importar desenho DATAGEO",
            Filter = "AutoCAD (*.dxf;*.dwg)|*.dxf;*.dwg|DXF (*.dxf)|*.dxf|DWG (*.dwg)|*.dwg|Todos (*.*)|*.*",
            CheckFileExists = true,
        };

        if (!string.IsNullOrWhiteSpace(_lastImportPath))
        {
            var dir = Path.GetDirectoryName(_lastImportPath);
            if (!string.IsNullOrWhiteSpace(dir) && Directory.Exists(dir))
            {
                dialog.InitialDirectory = dir;
            }
        }

        return dialog.ShowDialog() == DialogResult.OK ? dialog.FileName : null;
    }

    private static int ImportFileIntoCurrentDrawing(Database targetDb, string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        if (ext is not ".dxf" and not ".dwg")
        {
            throw new InvalidOperationException("Use arquivo .dxf ou .dwg exportado do DATAGEO.");
        }

        using var sourceDb = new Database(false, true);
        if (ext == ".dxf")
        {
            sourceDb.DxfIn(path, "");
        }
        else
        {
            sourceDb.ReadDwgFile(path, FileShare.Read, true, null);
        }

        var sourceCount = CountModelSpaceEntities(sourceDb);
        if (sourceCount == 0) return 0;

        targetDb.Insert(Matrix3d.Identity, sourceDb, false);
        return sourceCount;
    }

    private static int CountModelSpaceEntities(Database db)
    {
        var count = 0;
        using var tr = db.TransactionManager.StartTransaction();
        var msId = SymbolUtilityServices.GetBlockModelSpaceId(db);
        var ms = (BlockTableRecord)tr.GetObject(msId, OpenMode.ForRead);
        foreach (ObjectId id in ms)
        {
            if (!id.IsNull && !id.IsErased) count += 1;
        }
        tr.Commit();
        return count;
    }
}
