describe("Plain Text grammar", () => {
  let grammar = null;

  beforeEach(() => {
    waitsForPromise(() => lumine.packages.activatePackage("language-text"));

    runs(() => (grammar = lumine.grammars.grammarForScopeName("text.plain")));
  });

  it("parses the grammar", () => {
    expect(grammar).toBeTruthy();
    expect(grammar.scopeName).toBe("text.plain");
  });
});
