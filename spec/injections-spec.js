const languageText = require("../lib/main");

describe("Plain Text grammar injections", () => {
  it("registers TODOs on complete line nodes", () => {
    const registration = { dispose: jasmine.createSpy("dispose") };
    const todo = {
      addInjectionPoint: jasmine.createSpy("addInjectionPoint").and.returnValue(registration),
    };

    expect(languageText.consumeTodoInjection(todo)).toBe(registration);
    expect(todo.addInjectionPoint).toHaveBeenCalledOnceWith("text.plain", { types: ["line"] });
  });
});
