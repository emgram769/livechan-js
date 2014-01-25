Front End
====

User experience
- Conversation filtering
- Regex filtering
- Multiple chats at one (side by side)

Design
- New main theme with Yotsuba as option
- Click to hide/show chat input and sidebar

Back End
====

App structure
- Modularize code by separating DB interactions
- Models should prototype functions that are useful, eliminating ugly db code in web.js
- Convert POST request file uploads to socket.io

Hosting structure
- Separate node.js process for GET requests for chat data
- Separate node.js process for socket.io interactions
- Separate static content hosting to nginx (multithreaded)

Long Term
====

Distributed LiveChan
- Connect other livechan instances to create network

Costs
- Find a place to put ads to fund server without distracting users
- Host custom channels for a fee (enough to keep the other channels running as well)
