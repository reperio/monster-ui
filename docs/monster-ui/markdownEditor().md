title: markdownEditor()

# monster.ui.markdownEditor()
The `monster.ui.markdownEditor()` method converts a simple textarea into a markdown editor.

![](images/markdownEditor-preview.png)

## Syntax
```javascript
monster.ui.markdownEditor(target[, options], callback);
```

### Parameters

Key | Description | Type | Default | Required
:-: | --- | :-: | :-: | :-:
`target` | A jQuery object to be converted into a markdown editor. | `jQuery` | | `true`
`options` | List of options used to instantiate a markdown editor (available [options](https://github.com/sparksuite/simplemde-markdown-editor#configuration)). | `Object`([#/options](#options)) | | `false`
`callback` | Called with the `SimpleMDE` instance once the editor is ready. | `Function` | | `true`

### Callback
`callback(editor)` receives the [SimpleMDE](https://github.com/sparksuite/simplemde-markdown-editor) instance.

> **Breaking change:** `markdownEditor()` used to return the editor. The SimpleMDE library is no longer part of `main.js`: it loads the first time `markdownEditor()` is called, and the editor is handed to `callback` instead. `markdownEditor()` returns `undefined`. [`markdownToHtml()`](./markdownToHtml().md) is unaffected and stays synchronous.

## Description
The `monster.ui.markdownEditor()` method converts a simple textarea element into a powerful markdown editor which is specified by the `target` parameter. The toolbar can be customized or hidden completely, please see [markdownEditor docs](https://simplemde.com/) for reference.

To initialize the default markdown editor, the only parameter needed is `target`:
```javascript
var $target = $('#textarea-element');

monster.ui.markdownEditor($target, function(editor) {
  // editor is the SimpleMDE instance
});
```

## Examples
### Hide toolbar
```javascript
var $target = $('#textarea-element');
var overrideOptions = {
  toolbar: false
};

monster.ui.markdownEditor($target, overrideOptions, function(editor) {
  editor.value('# Hello');
});
```

[markdownEditor]: (https://simplemde.com/)
