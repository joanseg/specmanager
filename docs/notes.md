



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

- Fernando
- Andre
- vibecoding club (small wokwhop in a coffee shop first, later an open class)
- Startup europe guy
- Udemy instructur
- Zartis
- reddit


Improvements
- remove the /feature command, the /prd should create it automatically
- when a phase is finished the walkthough of that phase should be created automatically, when all phases are finished the feature walktrhough is created automatically, if it just one phase, three is no feature walkthough.
- was the Design.md and claude.md files revisited after feature executed? no, it has to be reviewd.
- Move the build after the Plan and rename execute command to build
- Readme file needs redoing
- refine skills:
    - Walkthough agent should do walkthoughs like the ones under /docs
    - Plan agent should do plans like

- ˜Markdown editor should be wysiwig˜
- The plan should always allocate a task at the end of the plan in order to review the UIs agains the provided designs in the design phase, if there are no designs in the design step then this task is not needed. The design reviewr task should use the claude code /chrome extension in order to verify the actual look and feel of the UIs in the browser.
- automate the need to kill claud etc
- how to avoid:
pkill -f '^claude$'
claude daemon stop
ps aux | grep specmanager | grep -v grep   # kill stragglers
lsof -nP -iTCP:4317 -sTCP:LISTEN


- Plan by default in one phase, unless the feature is a very big project, in that case askuserquestion to confirm the approach to split the feature in phases. Normally the very minimum that makes sense to stop and ask user to test in the middle of the feature build.
Wlaktrhiough agent should detect a phase has been built and fire automatically to chreate the walkthough.
Walkthough skill should be updated to write them with the structure correct, see this examples of good structure:
    - docs/temp/original-specs/phase-design-A-test-walkthrough.md
    - docs/temp/original-specs/phase-design-B-test-walkthrough.md
    - docs/temp/original-specs/phase-7-A-test-walkthrough.md