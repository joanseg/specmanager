



Improvements:
- Full dashboard redesign.

Ideas:
- When user goes through walkthough, can edit and add TODOs. e.g. TODO the board does not allow to view multiple walkthoughs. 
- Design management: 

Create an architecture and a plan for the following feature, break plan in phases and phases in tasks, score them in fibonnacci scale:

# Feature
There is no design input on the specmanager process. We are going to introduce it.
    - when user runs the command /specmanager:specmanager-init, a part from the current processes it will also create a DESIGN.md file that will be located in ./docs/DESIGN.md, if there is already a file there, it will update it. The DESIGN.md creation will follow best practices based on the specification writen on this page: https://stitch.withgoogle.com/docs/design-md/specification . The DESIGN.md content will be based on the current repo relevant UIs already existing.
    - the design.md file gets updated everytime all phases of a feature are implemented.
    - Create a new column on the kanban board right after architecture wich name is Design. User can run the command /specmanager:specmanager-design (user can attach screenshots or description), and it will be created a design brief document in html which will include the designs needed to build the new feature.
    - Design is optional, if no design is provided, the plan and tsks and later the execution will be done anyway. If design is provided, it will be used in the planing, tasks and execution.

# output
Create the architectural and plan document in ./docs/architecure-design-feature.html ./docs/plan-design-feature.md 




Who to share with:

- Andre
- vibecoding club
- Udemy instructur
- reddit
- 
- Zartis