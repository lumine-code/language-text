const fs = require("fs");
const path = require("path");

const packagePath = (name) => {
  const sibling = path.resolve(__dirname, "..", "..", name);
  return fs.existsSync(sibling) ? sibling : name;
};

describe("Plain Text static annotations", () => {
  let editor;

  beforeEach(async () => {
    await lumine.packages.activatePackage(packagePath("language-text"));
    await lumine.packages.activatePackage(packagePath("language-todo"));
  });

  afterEach(() => editor?.destroy());

  it("creates layers only for complete lines containing annotation tokens", async () => {
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("text.plain"));
    editor.setText("ordinary prose\nTODO finish this line\nordinary prose again\n");
    await editor.languageMode.ready;
    await editor.languageMode.atGrammarSettlement();
    const layers = editor.languageMode.getAllInjectionLayers();
    expect(layers.length).toBe(1);
    expect(layers[0].getCurrentRanges().map((range) => editor.getTextInBufferRange(range))).toEqual(
      ["TODO finish this line"],
    );
  });
});
