print('''rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rides/{ride} {
      // add rules later
      allow read, create: if (request.auth != null && request.resource.data.createdBy == request.auth.uid && request.resource.data.keys().hasOnly(["createdBy"]));
      allow update: if (''')
print(f'        // begin generated rules')
print(f'        request.auth != null &&')
print(f'          (')
for x in range(1,9):
    playerId = 'player'+str(x)
    neqs = ' && '.join([f'resource.data.player{y} != request.auth.uid' for y in range(1,9) if y != x])
    print(f'          // allow this person to claim {playerId}\n          (request.resource.data.{playerId} == request.auth.uid && request.resource.data.keys().hasOnly(["{playerId}"]) && {neqs}) ||')

for x in range(1,9):
    playerId = 'player'+str(x)
    print(f'          // this person is {playerId} and is setting their name\n          (resource.data.{playerId} == request.auth.uid && request.resource.data.keys().hasOnly(["{playerId}Name"])) ||')

for x in range(1,9):
    playerId = 'player'+str(x)
    print(f'          // this person is {playerId} and is setting their score\n          (resource.data.{playerId} == request.auth.uid && request.resource.data.keys().hasOnly(["{playerId}Score"])) ||')

print(f'          )')
print('''        );
    }
  }
}''')