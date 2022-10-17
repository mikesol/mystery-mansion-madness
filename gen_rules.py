print('''rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{score} {
      allow read, create: if (request.auth != null);
    }
    match /rides/{ride} {
      allow read, create: if (request.auth != null && request.resource.data.createdBy == request.auth.uid && request.resource.data.keys().hasOnly(["createdBy"]));
      allow update: if (''')
print(f'        // begin generated rules')
print(f'        request.auth != null &&')
print(f'          (')
for x in range(1,9):
    playerId = 'player'+str(x)
    neqs = ' && '.join([f'resource.data.player{y} != request.auth.uid' for y in range(1,9) if y != x])
    print(f'          // allow this person to claim {playerId}\n          (request.resource.data.{playerId} == request.auth.uid && request.resource.data.keys().hasOnly(["{playerId}", "{playerId}Position"]) && request.resource.data.{playerId}Position == {x} && {neqs}) ||')

for x in range(1,9):
    playerId = 'player'+str(x)
    print(f'          // this person is {playerId} and is setting their name\n          (resource.data.{playerId} == request.auth.uid && request.resource.data.keys().hasOnly(["{playerId}Name"])) ||')

for x in range(1,9):
    playerId = 'player'+str(x)
    ending = '' if x == 8 else '||'
    print(f'          // this person is {playerId} and is setting their score\n          (resource.data.{playerId} == request.auth.uid && request.resource.data.keys().hasOnly(["{playerId}Score"])) {ending}')

print(f'          )')
print('''        );
    }
  }
}''')