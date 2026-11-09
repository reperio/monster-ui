title: getJsoneditor()

# monster.ui.getJsoneditor()

## Syntax
```javascript
monster.ui.getJsoneditor(target, callback)
```

### Parameters

Key | Description | Type | Default | Required
:-: | --- | :-: | :-: | :-:
`target` | The JSON Editor widget container. | `jQuery` | |`true`
`callback` | Called with the `JSONEditor` instance, or `null` if `target` has no editor. | `Function` | |`true`

### Callback
`callback(editor)` receives the `JSONEditor` instance, or `null` if `target` has no editor.

> **Breaking change:** `getJsoneditor()` used to return the editor. It now waits on the same on-demand load of the JSONEditor library as [`jsoneditor()`](./jsoneditor().md) and hands the editor to `callback`. Because both calls wait on that load in order, `getJsoneditor()` called right after `jsoneditor()` on the same `target` finds the new editor. `getJsoneditor()` returns `undefined`.

## Description
The `monster.ui.getJsoneditor()` method provides access to the editor's instance from the DOM using the `target` parameter, which is the [JSONEditor](./jsoneditor().md) container. It hands the `JSONEditor` instance to `callback`.

To get the JSONEditor, you just need to pass the `target` parameter:
```javascript
// Editor's container
var $target = $('#jsoneditor');

monster.ui.getJsoneditor($target, function(jsoneditor) {
  if (jsoneditor) {
    jsoneditor.get();
  }
});
```
