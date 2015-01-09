#### Hermes


##### Introduction


Health Entity Relationship and Metadata Exploration System (HERMES) is a web-based vocabulary browsing tool for OMOP CDM v5

HERMES is a project as part of the Observational Health Data Sciences and Informatics (OHDSI, http://ohdsi.org) collaboration.

##### Features
* Search a vocabulary
* Exploring different concepts and their related concepts

##### Technology
* HTML5
* JavaScript

##### System Requirements
* Must run a web server (ex. Apache, nginx, IIS)
* HTML5-compatible web browser (ex. Chrome, IE10+, Firefox)

##### Dependencies
* Need to have [OHDSI WebAPI](https://github.com/OHDSI/WebAPI) available.

##### Getting Started
* Clone the HERMES repository 
* Add HERMES to your web server as a virtual directory.
* Edit the js/config.js file to point to your installation of the  [OHDSI WebAPI](https://github.com/OHDSI/WebAPI).

```
  var ohdsi_services_root = "http://[YOUR SERVER]/WebAPI/vocabulary/";
```

##### Getting involved
* [User guide and Help on our Wiki](http://www.ohdsi.org/web/wiki/doku.php?id=documentation:software:hermes)
* [Developer questions/comments/feedback](http://forums.ohdsi.org/c/developers)
* We use the GitHub issue tracker for all bugs/issues/enhancements

##### License
Apache
