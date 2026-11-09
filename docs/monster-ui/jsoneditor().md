title: jsoneditor()

# monster.ui.jsoneditor()
The `monster.ui.jsoneditor()` method generates an instance of a JSON editor with a set of handy methods and properties.

![](images/jsoneditor-preview.png)

## Syntax
```javascript
monster.ui.jsoneditor(target[, options], callback)
```

### Parameters

Key | Description | Type | Default | Required
:-: | --- | :-: | :-: | :-:
`target` | Container for the JSON Editor widget. | `jQuery` | |`true`
`options` | Let you override default editor options that can be found on the [JSONEditor](https://github.com/josdejong/jsoneditor/blob/master/docs/api.md) page. | `Object`([#options](#options)) | |`false`
`callback` | Called with the `JSONEditor` instance once the editor is ready. | `Function` | |`true`

### `options`
List of helper specific customizable settings (in opposition to the ones exposed by the JSON Editor library).

Key | Description | Type | Default | Required
:-: | --- | :-: | :-: | :-:
`json` | Default JSON to set in the editor. | `Object` | | `false`

### Callback
`callback(editor)` receives the `JSONEditor` instance.

> **Breaking change:** `jsoneditor()` used to return the editor. The JSONEditor library is no longer part of `main.js`: it loads the first time `jsoneditor()` or [`getJsoneditor()`](./getJsoneditor().md) is called, and the editor is handed to `callback` instead. `jsoneditor()` returns `undefined`.

## Description
The `monster.ui.jsoneditor()` method renders a customizable JSON editor into the specified `target`. It hands the `JSONEditor` instance to `callback` so you have access to its properties and methods. Please see [JSONEditor](https://github.com/josdejong/jsoneditor) for reference. To get the JSONEditor instance from the DOM please see [getJsoneditor()](./getJsoneditor().md).

To initialize the JSONEditor, you just need to pass the `target` parameter:
```html
<!--You need to set the container's size-->
<div id="jsoneditor" style="width: 400px; height: 400px;"></div>
```

```javascript
var $target = $('#jsoneditor');

monster.ui.jsoneditor($target, function(jsoneditor) {
  // jsoneditor is the JSONEditor instance
});
```

## Examples
### Use the method options

```javascript
var $target = $('#jsoneditor');
/* To know more about all available options please go to:
 https://github.com/josdejong/jsoneditor/blob/master/docs/api.md */
var options = {
  mode: 'review',
  modes: ['code', 'tree'],
  search: true
};
monster.ui.jsoneditor($target, options, function(jsoneditor) {
  // ...
});
```

### Get the final JSON object

```javascript
var $target = $('#jsoneditor');
monster.ui.jsoneditor($target, { json: { name: 'demo' } }, function(jsoneditor) {
  // This function gets the valid JSON object. If the JSON is not valid this method throws an exception.
  jsoneditor.get();
});
```
