using Autodesk.AutoCAD.Runtime;

[assembly: ExtensionApplication(typeof(DatageoNtripCad.PluginApplication))]

namespace DatageoNtripCad;

public sealed class PluginApplication : IExtensionApplication
{
    public void Initialize()
    {
        var doc = Autodesk.AutoCAD.ApplicationServices.Application.DocumentManager.MdiActiveDocument;
        doc?.Editor.WriteMessage(
            "\nDATAGEO NTRIP CAD carregado. Comandos: DATAGEOIMPORT, DATAGEOZOOM, DATAGEOINFO\n");
    }

    public void Terminate()
    {
    }
}
