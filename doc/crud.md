# Express CRUD

This component acts as an Express app builder you can use in your back-office. It's still in development and does not
provide the whole set of features we planned initially as we didn't need them immediately.

It's made to work natively with Mongoose models, but could work with any type of data, given you provide the necessary
access layers.

## Missing features

* Sorting in list mode
* Filtering in list mode
* Automatic helpers for partials:
  * URL generator
  * Confirmation for deletion
  * Pagination
  * …
* REST API

## Installation

You may need to copy the templates in `node_modules/doggybag/crud/views` and customize them the way you want. These
are the "layouts" for your CRUD modules, they must fill in your global layout, and will be completed with partials
(you must write too) for edit and list modes.

## Usage

Example: to add a `/users` route to your app to manage your `User` model, you need to define a few partials and just
call `crud.init()`.

### View

The template depends so much on your own style, and you could want something that is totally independent from your
model, then we decided to not provide any defaults or API for the list mode. Just display it the way you need.

Here is a common snippet:

```html
<table class="table table-striped">
  <thead>
  <tr>
    <!-- Titles -->
    <th>{{_ "Name"}}</th>
    <th>{{_ "E-mail"}}</th>
    <th>{{_ "Actions"}}</th>
  </tr>
  </thead>
  <tbody>
  {{#each users}}
  <tr>
    <!-- Data -->
    <td><a href="{{../crud_basepath}}/{{_id}}"><strong>{{name}}</strong></a></td>
    <td><a href="mailto:{{email}}">{{email}}</a></td>
    <td><ul>
      <!-- Action bar -->
      <li><a href="{{../crud_basepath}}/{{_id}}" class="btn">{{_ "Edit"}}</a></li>
      <li><a href="#" onclick="(function(f){if(confirm('{{_ "Are you sure you want to permanently delete user `%s`?" name}}')){f.action='{{../crud_basepath}}/delete/{{_id}}';f.submit();}return false;})(document.getElementById('deleteForm'))">{{_ "Delete"}}</a></li>
        </ul>
      </div>
    </td>
  </tr>
  {{/each}}
  </tbody>
</table>

<!-- Pagination -->
{{#if isPaginated}}
{{#if previousPage}}<a href="?page={{previousPage}}>«</a>{{/if}
{{numPage}}/{{nbPages}}
{{#if nextPage}}<a href="?page={{nextPage}}>»</a>{{/if}
{{/if}}
```

Note: `crud_basepath` is automatically defined and safe to use.

### Controller

```javascript
var crud = require('doggybag/crud');

var users = crud.init({
  model: mongoose.model('User'),
  listLocals: crud.helpers.defineLocals({table: "projects/list_table"})
});

app.mount('/users', users);
```

### Result

All this will result in a new bunch of routes added to your app, with corresponding middlewares.

#### Routes

Note: this is **not** a RESTful service, as it's not an initial requirement.

* GET /users -> List your items
* GET /users/create -> display a form to create a new item
* POST /users/delete/:id -> delete item
* GET /users/:id -> display a form to edit item
* POST /users/:id -> update item and redirect to edit
* POST /users -> create item and redirect to edit

#### View locals

You **must define** the view local `table`, using `crud.helpers.defineLocals` to map it to a partial for example.
This is what will be rendered as your objects' list.

You can use those variables in your customized views:

* In all modes
  * `crud_basepath` (string): the base URL.
  * `message` (object with keys `type` and `text`): a message to be displayed to user (error, success).
* In list mode
  * `objects` (array of object): contains the objects displayed. The variable name can be configured.
  * `isPaginated` (boolean): is number of pages greater than 1 ? The following variables are then defined:
    * `nbPages` (int): number of pages.
    * `numPage` (int): current page (taken from URL's parameter `page`, default 1).
    * `previousPage` (int): previous page (defined only if applicable).
    * `nextPage` (int): next page (defined only if applicable).
    * `pages` (array of int): all pages.
  * `title`: page title.
  * `empty` (boolean): if `count` is 0.
  * `count` (int): number of objects.
  * **`table`** (string): the main table (i.e. your partial rendered).
* In create/edit mode
  * `object`: contains the object edited. The variable name can be configured.
  * `formId` (string): a random unique ID you can use for your form (very useful if you have more than one crud per page).
  * `clientSideValidation` (array of rules): a rule is a hash with keys `fieldName` and `attributes` being a hash of `name: value`.
    It defines the HTML5 attributes you should add to your markup. It's automatically added on client with JS if you use default
    templates. You can specify your own HTML5 validations adding a `html5Validators` array to your `forms`' field.
  * `title`: page title
  * `form` (string): the rendered form.
  * `save_url`: form's action.

#### Request-level variables

* In list mode:
  * req.objects -> list all items
* In create/edit mode:
  * req.object -> current edited item
  * req.form -> current form instance

## Options of `crud.init()`

* `model`: Mongoose model (if you don't define this option, you **must** define `findAll` & `countPages` & `findOne` & `new` & `update` & `remove`).
  * `new`: method to create a new object from form data (`function(data,cb)` with cb being `function(err,object)`, default calls `new model`).
  * `update`: method to update an object from form data (`function(object,data,cb)` with cb being `function(err,object)`, default calls `model.update`).
  * `remove`: method to delete an object (`function(object,cb)` with cb being `function(err)`, default calls `object.remove`).
  * `findAll`: method to find all elements (`function(page,nb,sort,cb)` with cb being `function(err,objects)`, default calls `model.find`).
  * `findOne`: method to find an alement by id (`function(id,cb)` with cb being `function(err,object)`, default calls `model.findById`).
  * `countPages`: method to count total number of pages (`function(nbPerPage,cb)`, cb being `function(err,nbPages)`, default calls `model.count`).
* `views`: path to your views `edit` and `list` (defaults to embedded views so it can work out of the box given you use `hbs` template engine, but you may copy and customize those views).
* `prefix`: a prefix you can define if you need to "namespace" your URIs. Very useful for a CRUD about embedded documents.
* `gettext`: if you use a translation tool, and it's not `req.i18n.gettext` you need to override this option as `function(string,req)` which returns translated `string`.
* For edit mode:
  * `form`: mandatory `function(forms,cb)` with cb being a `function(err,generatedForm)`. This is where you build the edit form.
  * `varname`: variable name of your object in edit mode (default `object`).
  * `beforeEdit`: Express middleware called before rendering.
  * `editLocals`: called to define additional locals (`function(object,cb)` cb being `function(locals)`, default calls `cb(null)`).
  * `values`: method to calculate values passed to form, very useful if some fields are not corresponding to your model (`function(object,cb)`, cb being `function(err,values)`, default calls `object.toObject`).
  * `renderForm`: method to render your form (`function(form,forms,cb)` with cb being `function(err,html)`, default calls `form.toHTML(forms.render.twBootstrap)`).
* For list mode:
  * `varsname`: variable name of your objects's list in list mode (default `varname+'s'`).
  * `beforeList`: Express middleware called before rendering.
  * `nbPerPage`: pagination in list mode (default 25).
  * `defaultSort`: default sorting mode (an array of `[field,direction]`, default `[["_id", "asc"]]`).
  * `listLocals`: called to define additional locals (`function(objects,cb)` cb being `function(locals)`, default calls `cb(null)`).

You **must** provide `model` or the six following model options `new`, `update`, `remove`, `findOne`, `findAll` and `countPages`.

Note that `form`, `new`, `update`, `remove`, `findOne`, `findAll`, `countPages`, `editLocals`, `listLocals` and `values` callback all take `req` and `res` as additional last parameters, whenever you would need it.

## Helpers

Available un `crud.helpers` they will help you enjoy this component even in more advanced situations:

* `defineLocals` helps you map partials to view locals, very useful for i18n for example. It will return a function you
  can safely pass to `editLocals` or `listLocals` options. Example:
  `"listLocals":crud.helpers.defineLocals({ "table":"/path/to/views/list_table", "title":"/path/to/views/list_title" })`
* `sortArray` allows you to apply the `sort` option to an array of objects. Especially useful when you work with
  simple arrays and cannot rely on Mongoose's sort ability.

To see a simple example of fully working CRUD for an in-memory array, look at the unit tests in `test/crud.js`.

## More information

### Focus on the `defineLocals` helper

```javascript
// crud.helpers.defineLocals(partials, strings)
options.editLocals = crud.helpers.defineLocals({ "title": "path/to/edit_title" });
options.listLocals = crud.helpers.defineLocals({ "table": "path/to/list_table" }, { "empty": "No document found, you should create one!" });
```

* First hash defines asynchronous operations:
  * a string will be interpreted as the path to a partial
  * a function will be called as function(objects, fn, req, res) where fn is function(err, value)
* Second hash defines direct operations:
  * a string will be used as-is
  * a function will be called as function(objects, req, res) and its result used as value

### Field values

Default value for each field is given from (greatest to lowest priority):

* `field.modelValue` (see forms additions)
* `values` option callback
* `object[fieldName]` (default)

### Forms additions

`crud.js` adds support for new options to `doggybag/forms` component:

* `modelValue`: a callback used to populate form from model. This is especially useful if you do not plan to map each field to the corresponding model key. It can be declared in two flavors:
  * synchronous: function(object) -> return value
  * asynchronous: function(object, fn) -> calls fn(error, value)
* `htmlValidators`: a hashmap `attributeName: attributeValue` that will enable fields customization (done with client-side JavaScript to avoid uncertain string replacements), for example add `"htmlValidators": { "type": "email" }` to mark your input as validated against email syntax.
