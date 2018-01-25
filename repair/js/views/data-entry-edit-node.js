define(['backbone', 'underscore', 'models/activitygroup', 'models/activity',
        'models/actor', 'collections/flows', 'collections/stocks',
        'utils/loader', 'tablesorter'],
function(Backbone, _, ActivityGroup, Activity, Actor, Flows, Stocks, Loader){
  /**
   *
   * @author Christoph Franke
   * @name module:views/EditNodeView
   * @augments Backbone.View
   */
  var EditNodeView = Backbone.View.extend(
    /** @lends module:views/EditNodeView.prototype */
    {


  /**
   * callback for uploading the flows
   *
   * @callback module:views/EditNodeView~onUpload
   */
     
  /**
    * render view to edit the flows of a single node (actor, activity or activitygroup)
    *
    * @param {Object} options
    * @param {HTMLElement} options.el                                element the view will be rendered in
    * @param {string} options.template                               id of the script element containing the underscore template to render this view
    * @param {module:models/Actor|module:models/Activity|module:models/ActivityGroup} options.model the node to edit
    * @param {string} options.caseStudyId                            the id of the casestudy the node belongs to
    * @param {string} options.keyflowId                              the id of the keyflow the node belongs to
    * @param {string} options.keyflowName                            the name of the keyflow
    * @param {module:collections/Products} options.products          the available products
    * @param {module:collections/Materials} options.materials        the available materials
    * @param {module:collections/Publications} options.publications  the available publications
    * @param {module:views/EditNodeView~onUpload=} options.onUpload  called after successfully uploading the flows
    *
    * @constructs
    * @see http://backbonejs.org/#View
    */
    initialize: function(options){
      _.bindAll(this, 'render');
      this.template = options.template;
      this.keyflowId = options.keyflowId;
      this.keyflowName = options.keyflowName;
      this.caseStudyId = options.caseStudyId;
      this.products = options.products;
      this.materials = options.materials;
      this.publications = options.publications;
      
      this.onUpload = options.onUpload;

      var flowType = '';
      this.attrTableInner = '';
      if (this.model.tag == 'activity'){
        this.attrTableInner = this.getActivityAttrTable();
        flowType = 'activity';
      }
      else if (this.model.tag == 'activitygroup'){
        this.attrTableInner = this.getGroupAttrTable();
        flowType = 'activitygroup';
      }
      else if (this.model.tag == 'actor'){
        this.attrTableInner = this.getActorAttrTable();
        flowType = 'actor';
      }

      this.inFlows = new Flows([], {caseStudyId: this.caseStudyId,
                                    keyflowId: this.keyflowId,
                                    type: flowType});
      this.outFlows = new Flows([], {caseStudyId: this.caseStudyId,
                                      keyflowId: this.keyflowId,
                                      type: flowType});
      this.stocks = new Stocks([], {caseStudyId: this.caseStudyId,
                                    keyflowId: this.keyflowId,
                                    type: flowType});
      this.newInFlows = new Flows([], {caseStudyId: this.caseStudyId,
                                        keyflowId: this.keyflowId,
                                        type: flowType});
      this.newOutFlows = new Flows([], {caseStudyId: this.caseStudyId,
                                        keyflowId: this.keyflowId,
                                        type: flowType});
      this.newStocks = new Stocks([], {caseStudyId: this.caseStudyId,
                                      keyflowId: this.keyflowId,
                                      type: flowType});
      var _this = this;

      var loader = new Loader(document.getElementById('flows-edit'),
                              {disable: true});
      // fetch inFlows and outFlows with different query parameters

      $.when(this.inFlows.fetch({data: 'destination=' + this.model.id}),
             this.outFlows.fetch({data: 'origin=' + this.model.id}),
             this.stocks.fetch({data: 'origin=' + this.model.id})).then(function() {
          loader.remove();
          _this.render();
      });
    },

    /*
      * dom events (managed by jquery)
      */
    events: {
      'click #upload-flows-button': 'uploadChanges',
      'click #add-input-button, #add-output-button, #add-stock-button': 'addFlowEvent',
      'click #confirm-datasource': 'confirmDatasource'
      //'click #remove-input-button, #remove-stock-button, #remove-output-button': 'deleteRowEvent'
    },

    /*
      * render the view
      */
    render: function(){
      var _this = this;
      var html = document.getElementById(this.template).innerHTML
      var template = _.template(html);
      this.el.innerHTML = template({name: this.model.get('name')});
      
      this.dsTable = document.getElementById('publications-table');
      
      var popOverSettings = {
          placement: 'right',
          container: 'body',
          trigger: 'manual',
          html: true,
          content: this.attrTableInner
      }
      require('bootstrap');
      this.setupPopover($('#node-info').popover(popOverSettings));

      // render inFlows
      this.inFlows.each(function(flow){
        _this.addFlowRow('input-table', flow, 'origin');
      });
      this.outFlows.each(function(flow){
        _this.addFlowRow('output-table', flow, 'destination');
      });
      this.stocks.each(function(stock){
        _this.addFlowRow('stock-table', stock, 'origin', true);
      });
      
      this.setupDsTable();
      this.renderDatasources(this.publications);
    },
    
    /* set a (jQuery) popover-element to appear on hover and stay visible on hovering popover */
    setupPopover: function(el){
      el.on("mouseenter", function () {
        var _this = this;
        $(this).popover("show");
        $(".popover").on("mouseleave", function () {
          $(_this).popover('hide');
        });
      }).on("mouseleave", function () {
        var _this = this;
        setTimeout(function () {
          if (!$(".popover:hover").length) {
            $(_this).popover("hide");
          }
        }, 300);
      });
    },

    // add a flow to table (which one is depending on type of flow)
    // targetIdentifier is the attribute of the flow with the id of the node connected with this node 
    // set skipTarget to True for stocks
    addFlowRow: function(tableId, flow, targetIdentifier, skipTarget){
      var _this = this;

      var table = this.el.querySelector('#' + tableId);
      var row = table.insertRow(-1);

      // checkbox for marking deletion

      var checkbox = document.createElement("input");
      checkbox.type = 'checkbox';
      row.insertCell(-1).appendChild(checkbox);

      checkbox.addEventListener('change', function() {
        row.classList.toggle('strikeout');
        row.classList.toggle('dsbld');
        flow.markedForDeletion = checkbox.checked;
      });
      
      /* add an input-field to the row, 
       * tracking changes made by user to the attribute and automatically updating the model 
       */
      var addInput = function(attribute, inputType){
        var input = document.createElement("input");
        if (inputType != null)
          input.type = inputType;
        input.value = flow.get(attribute);
        row.insertCell(-1).appendChild(input);

        input.addEventListener('change', function() {
          flow.set(attribute, input.value);
        });
        return input;
      };

      var amount = addInput('amount', 'number');
      amount.min = 0;
      
      // origin respectively destination (skipped at stocks)

      if (!skipTarget){
        // select input for target (origin resp. destination of flow)

        var nodeSelect = document.createElement("select");
        var ids = [];
        var targetId = flow.get(targetIdentifier);
        this.model.collection.each(function(model){
          // no flow to itself allowed
          if (model.id != _this.model.id){
            var option = document.createElement("option");
            option.text = model.get('name');
            option.value = model.id;
            nodeSelect.add(option);
            ids.push(model.id);
          };
        });
        var idx = ids.indexOf(targetId);
        nodeSelect.selectedIndex = idx.toString();
        row.insertCell(-1).appendChild(nodeSelect);

        nodeSelect.addEventListener('change', function() {
          flow.set(targetIdentifier, nodeSelect.value);
        });
      };
      
      var productWrapper = document.createElement("span");
      // prevent breaking 
      productWrapper.setAttribute("style", "white-space: nowrap");
      row.insertCell(-1).appendChild(productWrapper); 
      
      // input for product
      var productSelect = document.createElement("select");
      var ids = [];
      var p = flow.get('product');
      this.products.each(function(product){
        var option = document.createElement("option");
        option.text = product.get('name');
        option.value = product.id;
        productSelect.add(option);
        ids.push(product.id);
      });
      var idx = ids.indexOf(p);
      productSelect.selectedIndex = idx.toString();
      productWrapper.appendChild(productSelect);

      productSelect.addEventListener('change', function() {
        flow.set('product', productSelect.value);
      });
      
      // information popup for products
      var info = document.createElement('div');
      info.style.cursor = 'pointer';
      info.style.marginLeft = "5px";
      info.classList.add('pop-function');
      info.setAttribute('rel', 'popover');
      info.classList.add('glyphicon');
      info.classList.add('glyphicon-info-sign');
      info.title = 'Composition';
      productWrapper.appendChild(info);
      
      var popOverSettings = {
          placement: 'right',
          container: 'body',
          trigger: 'manual',
          html: true,
          content: function () {
              var product = _this.products.get(productSelect.value);
              if (product == null) return '';
              var html = document.getElementById('popover-product-template').innerHTML;
              var template = _.template(html);
              var content = template({fractions: product.get('fractions'), 
                                      materials: _this.materials,
                                      productName: product.get('name')});
              return content;
          }
      }
      
      this.setupPopover($(info).popover(popOverSettings));
      
      // raw checkbox
      
      var rawCheckbox = document.createElement("input");
      rawCheckbox.type = 'checkbox';
      row.insertCell(-1).appendChild(rawCheckbox);

      rawCheckbox.addEventListener('change', function() {
        flow.set('raw', rawCheckbox.checked);
      });
      
      var year = addInput('year', 'number');
      year.min = 0;
      year.max = 3000;
      
      // description field
      
      var description = document.createElement("textarea");
      description.rows = "1";
      description.value = flow.get('description');
      //description.style.resize = 'both';
      row.insertCell(-1).appendChild(description);

      description.addEventListener('change', function() {
        flow.set('description', description.value);
      });
      
      // general datasource
      
      var sourceWrapper = document.createElement("div");
      sourceWrapper.style.float = 'left';
      var sourceCell = row.insertCell(-1);
      // prevent breaking 
      sourceCell.setAttribute("style", "white-space: nowrap");
      var genSource = document.createElement('input');
      var pubId = flow.get('publication');
      if (pubId){
        var publication = this.publications.get(pubId)
        var title = publication.get('title');
        genSource.value = title;
        genSource.title = title;
      }
      genSource.disabled = true;
      genSource.style.cursor = 'pointer';
      var editBtn = document.createElement('button');
      var pencil = document.createElement('span');
      editBtn.classList.add('btn');
      editBtn.classList.add('btn-primary');
      editBtn.classList.add('square');
      editBtn.appendChild(pencil);
      editBtn.title = gettext('edit datasource');
      pencil.classList.add('glyphicon');
      pencil.classList.add('glyphicon-pencil');
      function onChange(publication){
        if (publication != null){
          var title = publication.get('title');
          genSource.value = title;
          genSource.title = title;
          genSource.title = title;
          flow.set('publication', publication.id)
          genSource.dispatchEvent(new Event('change'));
          // ToDo set it to model
        }
      };
      editBtn.addEventListener('click', function(){
        _this.editDatasource(onChange);
      });
      
      /*
      var collapse = document.createElement('div');
      var dsRow = table.insertRow(-1);
      
      // collapse icon to show/hide individual datasources
      dsRow.classList.add('hidden');
      collapse.style.marginLeft = "4px";
      collapse.style.cursor = 'pointer';
      collapse.classList.add('glyphicon');
      collapse.title = 'show individual datasources';
      collapse.classList.add('glyphicon-chevron-down');
      sourceWrapper.addEventListener('click', function(){
        dsRow.classList.toggle('hidden');
        collapse.classList.toggle('glyphicon-chevron-down');
        collapse.classList.toggle('glyphicon-chevron-up');
      });
      */
      
      sourceWrapper.appendChild(genSource);
      sourceCell.appendChild(sourceWrapper);
      sourceCell.appendChild(editBtn);
      
      /*
      sourceWrapper.appendChild(collapse);
      
      // own row for individual Datasources
      
      dsRow.classList.add('popunder');
      dsRow.insertCell(-1).innerHTML = gettext('Sources:');
      
      var datasourcableAttributes = ['amount', 'product'];
      // all except stocks have datasource for target
      if (!skipTarget)
        datasourcableAttributes.splice(1, 0, targetIdentifier)
      _.each(datasourcableAttributes, function(attr){
        var source = document.createElement('input');
        source.value = 'test';
        source.disabled = true;
        var button = document.createElement('button');
        button.innerHTML = gettext('Set');
        button.classList.add('btn');
        button.classList.add('btn-primary');
        button.classList.add('square');
        function onChange(publication){
          if (publication != null){
            source.value = publication.get('title');
            source.dispatchEvent(new Event('change'));
          }
          // ToDo set it to model
        };
        button.addEventListener('click', function(){
          _this.editDatasource(onChange);
        });
        //var sel = document.createElement("select");
        var cell = dsRow.insertCell(-1);
        cell.setAttribute("style", "white-space: nowrap");
        cell.appendChild(source);
        cell.appendChild(button);
        // general datasource overrides all sub datasources
        genSource.addEventListener('change', function(){
          source.value = genSource.value;
        });
        // sub datasources changes -> show that general datasource is custom by leaving it blank
        source.addEventListener('change', function(){
          genSource.value = '↓↓ ' + gettext('custom') + ' ↓↓';
        });
      });*/
      
      return row;
    },

    // on click add row button
    addFlowEvent: function(event){
      var buttonId = event.currentTarget.id;
      var tableId;
      var flow;
      var targetIdentifier;
      var skipTarget = false;
      if (buttonId == 'add-input-button'){
        tableId = 'input-table';
        flow = this.newInFlows.add({});
        targetIdentifier = 'origin';
        flow = this.newOutFlows.add({
          'amount': 0,
          'origin': null,
          'destination': this.model.id,
          'quality': null
        });
      }
      else if (buttonId == 'add-output-button'){
        tableId = 'output-table';
        targetIdentifier = 'destination';
        flow = this.newOutFlows.add({
          'amount': 0,
          'origin': this.model.id,
          'destination': null,
          'quality': null
        });
      }
      else if (buttonId == 'add-stock-button'){
        tableId = 'stock-table';
        targetIdentifier = 'origin';
        flow = this.newStocks.add({
          'amount': 0,
          'origin': this.model.id,
          'quality': null
        });
        skipTarget = true;
      }
      this.addFlowRow(tableId, flow, targetIdentifier, skipTarget);

    },

    deleteRowEvent: function(event){
      var buttonId = event.currentTarget.id;
      var tableId = (buttonId == 'remove-input-button') ? 'input-table':
        (buttonId == 'remove-output-button') ? 'output-table':
        'stock-table';
      this.deleteTableRows(tableId);
    },

    deleteTableRows: function(tableId)  {
      var table = this.el.querySelector('#' + tableId);
      var rowCount = table.rows.length;

      // var i=1 to start after header
      for(var i = rowCount - 1; i > 0; i--) {
        var row = table.rows[i];
        var checkbox = row.cells[0].getElementsByTagName('input')[0];
        if(checkbox.type == 'checkbox' && checkbox.checked == true) {
          table.deleteRow(i);
        }
      }
    },

    getGroupAttrTable: function(){
      var html = document.getElementById('group-attributes-template').innerHTML
      var template = _.template(html);
      return template({
        name: this.model.get('name'),
        keyflow: this.keyflowName,
        code: this.model.get('code')
      });
    },

    getActivityAttrTable: function(){
      var html = document.getElementById('activity-attributes-template').innerHTML
      var template = _.template(html);
      return template({
        name: this.model.get('name'),
        keyflow: this.keyflowName,
        group: this.model.get('activitygroup'),
        nace: this.model.get('nace')
      });
    },

    getActorAttrTable: function(){
      var html = document.getElementById('actor-attributes-template').innerHTML
      var template = _.template(html);
      return template({
        name: this.model.get('name'),
        keyflow: this.keyflowName,
        bvdid: this.model.get('BvDid'),
        activity: this.model.get('activity'),
        url: this.model.get('website'),
        year: this.model.get('year'),
        employees: this.model.get('employees'),
        turnover: this.model.get('turnover')
      });
    },
    
    // open modal for setting the datasource
    editDatasource: function(onChange){
      var _this = this;
      this.activeDs = null;
      _.each(this.dsRows, function(row){ row.classList.remove('selected'); });
      this.onDsChange = onChange;
      $('#datasource-modal').modal('show'); 
    },
    
    confirmDatasource: function(){
      this.onDsChange(this.activeDs);
    },
    
    setupDsTable: function(){
      require('libs/jquery.tablesorter.pager');
      $(this.dsTable).tablesorter({});
      // ToDo: set tablesorter pager if table is empty (atm deactivated in this case, throws errors)
      if ($(this.dsTable).find('tr').length > 1)
        $(this.dsTable).tablesorterPager({container: $("#dspager")});
      
      ////workaround for a bug in tablesorter-pager by triggering
      ////event that pager-selection changed to redraw number of visible rows
      //var sel = document.getElementById('dspagesize');
      //sel.selectedIndex = 0;
      //sel.dispatchEvent(new Event('change'));
    
    },
    
    renderDatasources: function(publications){
      var _this = this;
      var table = this.dsTable;
      $.tablesorter.clearTableBody($(table)[0]);
      this.dsRows = [];
      publications.each(function(publication){
        var row = document.createElement('tr');
        row.style.cursor = 'pointer';
        _this.dsRows.push(row);
        row.insertCell(-1).innerHTML = publication.get('title');
        row.insertCell(-1).innerHTML = publication.get('authors');
        row.insertCell(-1).innerHTML = publication.get('doi');
        var anchor = document.createElement('a');
        var url = publication.get('publication_url');
        anchor.href = url;
        anchor.innerHTML = url;
        anchor.target = '_blank';
        row.insertCell(-1).appendChild(anchor);
        $(table).find('tbody').append($(row)).trigger('addRows', [$(row), true]);
        
        row.addEventListener('click', function() {
          _.each(_this.dsRows, function(row){ row.classList.remove('selected'); });
          row.classList.add('selected');
          _this.activeDs = publication;
        });
      });
    },

    uploadChanges: function(){
      var _this = this;
      
      var modelsToSave = [];
      var modelsToDestroy = [];
      // delete exisiting flows if marked for deletion
      // otherwise update them if they changed
      var update = function(model){
        if (model.markedForDeletion)
          modelsToDestroy.push(model);
        else if (model.changedAttributes() != false)
          modelsToSave.push(model);
      };
      this.inFlows.each(update);
      this.outFlows.each(update);
      this.stocks.each(update);

      // save added flows only, when they are not marked for deletion
      var create = function(model){
        if (!model.markedForDeletion && Object.keys(model.attributes).length > 0) // sometimes empty models sneak in, not sure why
          modelsToSave.push(model);
      }
      this.newInFlows.each(create);
      this.newOutFlows.each(create);
      this.newStocks.each(create);
      
      // chain save and destroy operations
      var saveComplete = _.invoke(modelsToSave, 'save');
      var destructionComplete = _.invoke(modelsToDestroy, 'destroy');
      
      var loader = new Loader(document.getElementById('flows-edit'),
                              {disable: true});
      var onError = function(response){
        alert(response.responseText); 
        loader.remove();
      };
      $.when.apply($, saveComplete).done(function(){
        $.when.apply($, destructionComplete).done(function(){
          loader.remove();
          console.log('upload complete');
          _this.onUpload();
        }).fail(onError);
      }).fail(onError);
    },

    /**
      * remove this view from the DOM
      */
    close: function(){
      this.undelegateEvents(); // remove click events
      this.unbind(); // Unbind all local event bindings
      this.el.innerHTML = ''; //empty the DOM element
    },

  });
  return EditNodeView;
}
);