#### Hermes

**HERMES is no longer under active development as the functionality it provided is now subsumed within the larger [ATLAS](http://www.github.com/ohdsi/atlas) project.**

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
* Need to have [OHDSI WebAPI](https://github.com/OHDSI/WebAPI) available. (NOTE: The current release of HERMES has a default config.js value that provides access to the publicly hosted version of the OHDSI WebAPI)

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

##### Release Notes
**2015.01.22**

 - revamped the view of a concept that you select from a search
  - concept name and properties now appears in a panel header
  - added a save button to the concept name display on the top right of the concept container which will allow the user to save the current concept to a list of saved concepts
 - revamped the related concept table features
  - added icons for the save, filter, and select features of the related concept table
  - advanced filters are now accessed through the filter list
  - simple 'prompt' filters are now accessed through the filter list
  - a 'clear filters' option is now available on the menu to clear the currently applied filters
  - added a check icon to the beginning of each related concept row for easy selection of concepts (clicking on the row will also select the row)
 - shopping cart
  - a shopping cart icon is now visible in the top right of the screen
  - the shopping cart icon is replaced with the number of saved concepts once a user saves at least one concept
 - compatibility
  - reverted to jquery 1.11.2 for broader browser compatibility
 - saved concepts
  - added remove selected and remove all options to the saved concept table
  - added a new 'flash' icon button to the actions that can be performed on the set of saved concepts, currently still just export to code list

##### License
Apache
