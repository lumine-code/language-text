const path = require("path");

describe("Plain Text sample fixture", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-todo");
    await lumine.packages.activatePackage("language-log");
    await lumine.packages.activatePackage("language-text");
  });

  it("parses prose and hosts TODO injections", async () => {
    const editor = await lumine.workspace.open(path.join(__dirname, "fixtures", "sample.txt"));
    const languageMode = editor.getBuffer().getLanguageMode();
    await languageMode.ready;
    await languageMode.atTransactionEnd();

    expect(editor.getGrammar().scopeName).toBe("text.plain");
    expect(languageMode.tree.rootNode.hasError).toBe(false);
    await conditionPromise(() =>
      editor
        .scopeDescriptorForBufferPosition([4, 0])
        .getScopesArray()
        .includes("storage.type.class.todo"),
    );
    expect(editor.scopeDescriptorForBufferPosition([4, 0]).getScopesArray()).toContain(
      "storage.type.class.todo",
    );
  });
});
