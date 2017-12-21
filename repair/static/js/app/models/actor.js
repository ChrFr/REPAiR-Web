define(["backbone", "app-config"],

  function(Backbone, config) {

    var Actor = Backbone.Model.extend({
      idAttribute: "id",
      tag: 'actor',
      urlRoot: function(){
        // if an activity is given, take the route that retrieves all actors 
        // of the activity
        if (this.activityId != null)
          return config.api.actorsInGroup.format(
            this.caseStudyId, this.keyflowId, this.activityGroupCode, this.activityId);
        // if no activity is given, get all activities in the casestudy
        else
          return config.api.actors.format(this.caseStudyId, this.keyflowId);
      },

      initialize: function (attributes, options) {
        this.caseStudyId = options.caseStudyId;
        this.activityId = options.activityId;
        this.activityGroupCode = options.activityGroupCode;
        this.keyflowId = options.keyflowId;
        // out of a sudden backbone didn't set the urlRoot correctly, if instantiated via actors-collection
        // workaround: take url passed by collection as urlRoot
        //if (options.url)
          //this.urlRoot = options.url;
      },

    });
    return Actor;
  }
);