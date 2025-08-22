test = int(input())
ans = []
for i in range(test):
  n = int(input())
  arr = list(map(int, input().split()))

  i = 0
  min = float('inf')

  while i < len(arr):

    if arr[i] >= min * 2:
      break

    if arr[i] < min:
      min = arr[i]

    i += 1

  if i == len(arr):
    ans.append("Yes")
  else:
    ans.append("No")


  arr = []

for i in ans:
  print(i)