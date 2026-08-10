describe("Plain Text grammar", () => {
  let grammar = null;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-text");

    grammar = lumine.grammars.grammarForScopeName("text.plain");
  });

  it("parses the grammar", () => {
    expect(grammar).toBeTruthy();
    expect(grammar.scopeName).toBe("text.plain");
  });
});
